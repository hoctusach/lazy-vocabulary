/**
 * Cloud sync for per-user translation overrides (FB-33 follow-up).
 *
 * Server side (already applied, migration user_translation_overrides_2026_11_22): table
 * user_translation_overrides plus the SECURITY DEFINER RPCs list_translation_overrides(),
 * set_translation_override(text, text) and clear_translation_override(text), gated by the X-Session-Token
 * session. A user only ever reaches their own rows.
 *
 * Rules:
 *  - localStorage (translationOverrides.ts) stays the source the editor reads. Signed out / offline = local only.
 *  - Pull on sign-in / app start / coming back online; push on save and on clear.
 *  - Merge is last-write-wins on updated_at (local writes carry a client timestamp, clears a tombstone).
 *    A failed push is retried implicitly: the local copy is still newer, so the next sync pushes it.
 *  - Nothing here may throw: a missing table, an RPC error or a throwing storage keeps local data untouched.
 *  - Shared vocabulary records are never touched.
 */
import { hasStoredSignIn } from '@/lib/auth';
import { callFriendsRpc } from '@/lib/progress/friends';
import { USER_KEY_EVENT_NAME } from '@/lib/userKeyEvents';
import {
  TRANSLATION_OVERRIDE_EVENT,
  applyRemoteOverride,
  currentOverrideUser,
  readAllOverrides,
  readOverrideMeta,
} from './translationOverrides';

export type RemoteOverride = { word_id: string; translation: string; updated_at: string };
export type MergePlan = {
  /** apply to local storage: text null = cleared in the cloud */
  applyLocal: { id: string; text: string | null; t: number }[];
  /** send to the cloud: text '' = clear */
  push: { id: string; text: string }[];
};

/** Pure last-write-wins merge. Ties keep the server copy (no needless writes). */
export function planMerge(
  local: Record<string, string>,
  meta: Record<string, { t: number; d?: boolean }>,
  remote: RemoteOverride[],
): MergePlan {
  const plan: MergePlan = { applyLocal: [], push: [] };
  const remoteById = new Map<string, { text: string; t: number }>();
  for (const r of remote) {
    const t = Date.parse(r.updated_at);
    if (typeof r.word_id === 'string' && typeof r.translation === 'string' && r.translation) {
      remoteById.set(r.word_id, { text: r.translation, t: Number.isFinite(t) ? t : 0 });
    }
  }
  const ids = new Set<string>([...remoteById.keys(), ...Object.keys(local), ...Object.keys(meta)]);
  for (const id of ids) {
    const r = remoteById.get(id);
    const text = local[id];
    const m = meta[id];
    const lt = m?.t ?? 0; // legacy local value without a stamp loses to the server
    if (r) {
      if (text === r.text) {
        if (!m || m.t !== r.t || m.d) plan.applyLocal.push({ id, text: r.text, t: r.t });
      } else if (m?.d) {
        if (lt > r.t) plan.push.push({ id, text: '' });
        else plan.applyLocal.push({ id, text: r.text, t: r.t });
      } else if (text !== undefined && lt > r.t) {
        plan.push.push({ id, text });
      } else {
        plan.applyLocal.push({ id, text: r.text, t: r.t });
      }
    } else if (text !== undefined && !m?.d) {
      plan.push.push({ id, text }); // exists only here
    }
    // no remote row and tombstone / nothing local: already consistent
  }
  return plan;
}

function canUseCloud(user: string): boolean {
  if (!user || user === 'anon') return false;
  try {
    return hasStoredSignIn();
  } catch {
    return false;
  }
}

let running: Promise<void> | null = null;

/** Pull, merge (last-write-wins), push the differences. Never throws; resolves when done. */
export function syncTranslationOverrides(user = currentOverrideUser()): Promise<void> {
  if (!canUseCloud(user)) return Promise.resolve();
  if (running) return running;
  running = (async () => {
    try {
      const data = await callFriendsRpc('list_translation_overrides');
      const rows = Array.isArray(data) ? (data as RemoteOverride[]) : [];
      const plan = planMerge(readAllOverrides(user), readOverrideMeta(user), rows);
      for (const a of plan.applyLocal) applyRemoteOverride(user, a.id, a.text, a.t);
      for (const p of plan.push) await pushOverride(user, p.id, p.text);
    } catch (e) {
      console.warn('[translation-sync] pull failed; keeping local data', (e as Error)?.message);
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Push one override (text '' clears it). Never throws. */
export async function pushOverride(user: string, id: string, text: string): Promise<boolean> {
  if (!canUseCloud(user)) return false;
  try {
    if (text) await callFriendsRpc('set_translation_override', { p_word_id: id, p_translation: text });
    else await callFriendsRpc('clear_translation_override', { p_word_id: id });
    return true;
  } catch (e) {
    console.warn('[translation-sync] push failed; kept locally', (e as Error)?.message);
    return false;
  }
}

let started = false;

/** Idempotent. Wires pull-on-sign-in/start/online and push-on-save. Safe on web, native, and signed out. */
export function startTranslationOverridesSync(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  const pull = () => void syncTranslationOverrides().catch(() => undefined);
  window.addEventListener(USER_KEY_EVENT_NAME, pull);
  window.addEventListener('online', pull);
  window.addEventListener(TRANSLATION_OVERRIDE_EVENT, (ev) => {
    const d = (ev as CustomEvent<{ id?: string; user?: string; source?: string }>).detail;
    if (!d || d.source !== 'local' || !d.id || !d.user) return;
    const text = readAllOverrides(d.user)[d.id] ?? '';
    void pushOverride(d.user, d.id, text).catch(() => undefined);
  });
  pull();
}
