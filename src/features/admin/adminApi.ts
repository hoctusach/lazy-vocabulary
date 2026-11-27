import { callFriendsRpc } from '@/lib/progress/friends';
import type { SheetData } from '@/types/vocabulary';
import { MANUAL_CATEGORIES } from '@/features/word-sets/manualSet';

/**
 * [FB-55] Admin client. The admin check is SERVER-SIDE only: every RPC re-checks app_admins with the session user
 * (X-Session-Token, same helper as friends). Nothing here trusts localStorage or a client flag; a missing RPC/table
 * or any error simply means "not admin" / "could not save".
 */
export const OFFICIAL_CATEGORIES = MANUAL_CATEGORIES;

export type OfficialWordKey = { word: string; category: string };
export type OfficialWordEdit = {
  word: string;
  meaning: string;
  example: string;
  translation: string;
  category: string;
};
export type AdminImportedSetInfo = { id: string; ownerNickname: string; name: string; wordCount: number };

let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;

export function __resetAdminForTests(): void {
  cached = null;
  inflight = null;
}

/** True only when the server says so. Cached in memory for the page session, never persisted. */
export async function fetchIsAdmin(force = false): Promise<boolean> {
  if (!force && cached !== null) return cached;
  if (!force && inflight) return inflight;
  inflight = (async () => {
    try {
      const data = await callFriendsRpc('admin_whoami');
      cached = data === true;
    } catch {
      cached = false;
    }
    inflight = null;
    return cached;
  })();
  return inflight;
}

export function forgetAdmin(): void {
  cached = null;
}

const text = (v: unknown) => (typeof v === 'string' ? v : '');

/** Save an official word through the admin RPC (updates the official row in place, with audit). Throws Error(message). */
export async function saveOfficialWord(key: OfficialWordKey, edit: OfficialWordEdit): Promise<void> {
  if (!edit.word.trim() || !edit.meaning.trim()) throw new Error('Word and meaning are required.');
  if (!OFFICIAL_CATEGORIES.includes(edit.category)) throw new Error('Pick a category from the list.');
  try {
    await callFriendsRpc('admin_update_official_word', {
      p_word: key.word,
      p_category: key.category,
      p_new_word: edit.word.trim(),
      p_meaning: edit.meaning.trim(),
      p_example: edit.example.trim(),
      p_translation: edit.translation.trim(),
      p_new_category: edit.category,
    });
  } catch (error) {
    const raw = (error as Error)?.message ?? '';
    throw new Error(/not allowed/i.test(raw) ? 'You are not allowed to edit official words.' : 'Could not save. Try again later.');
  }
}

export async function listAllImportedSets(): Promise<AdminImportedSetInfo[]> {
  try {
    const data = await callFriendsRpc('admin_list_imported_sets');
    if (!Array.isArray(data)) return [];
    return data.map((r) => {
      const row = r as Record<string, unknown>;
      return { id: text(row.id), ownerNickname: text(row.owner_nickname) || 'unknown', name: text(row.name), wordCount: Number(row.word_count) || 0 };
    }).filter((s) => s.id);
  } catch {
    return [];
  }
}

export async function getImportedSet(id: string): Promise<{ name: string; sheets: SheetData } | null> {
  try {
    const data = await callFriendsRpc('admin_get_imported_set', { p_id: id });
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
    if (!row || typeof row.sheets !== 'object' || row.sheets === null) return null;
    return { name: text(row.name) || 'Imported set', sheets: row.sheets as SheetData };
  } catch {
    return null;
  }
}

/** Best-effort upload of this device's imported/manual sets (own rows only). Never throws. */
export async function syncImportedSets(sets: { id: string; name: string; sheets: SheetData }[]): Promise<void> {
  for (const s of sets) {
    try {
      await callFriendsRpc('sync_imported_set', { p_client_id: s.id, p_name: s.name, p_sheets: s.sheets });
    } catch {
      return; // table missing / signed out: stop quietly
    }
  }
}

/** Best-effort removal of a deleted set from the server copy (own rows only). Never throws. */
export async function deleteImportedSetRemote(clientId: string): Promise<void> {
  try {
    await callFriendsRpc('delete_imported_set', { p_client_id: clientId });
  } catch {
    /* signed out / table missing */
  }
}
