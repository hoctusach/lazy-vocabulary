// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const callRpc = vi.fn();
let signedIn = true;
vi.mock('@/lib/progress/friends', () => ({ callFriendsRpc: (...a: unknown[]) => callRpc(...a) }));
vi.mock('@/lib/auth', () => ({ hasStoredSignIn: () => signedIn }));

const W = { word: 'give up', category: 'Phrasal Verb' };
const ID = 'default::phrasal verb::give up';

async function mods() {
  const store = await import('@/lib/translations/translationOverrides');
  const sync = await import('@/lib/translations/translationOverridesSync');
  return { store, sync };
}

describe('[FB-33] translation overrides cloud sync', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    callRpc.mockReset();
    callRpc.mockResolvedValue(undefined);
    signedIn = true;
  });

  it('not signed in: editor works from local storage and no RPC is called', async () => {
    signedIn = false;
    const { store, sync } = await mods();
    store.setTranslationOverride(W, 'một\nhai', 'userA');
    expect(store.getTranslationOverride(W, 'userA')).toBe('một\nhai');
    await sync.syncTranslationOverrides('userA');
    expect(await sync.pushOverride('userA', ID, 'x')).toBe(false);
    expect(callRpc).not.toHaveBeenCalled();
    // the anonymous user key never goes to the cloud either
    signedIn = true;
    await sync.syncTranslationOverrides('anon');
    expect(callRpc).not.toHaveBeenCalled();
  });

  it('signed in: save pushes set_translation_override, clear pushes clear_translation_override, pull calls list', async () => {
    const { store, sync } = await mods();
    sync.startTranslationOverridesSync();
    await Promise.resolve();
    callRpc.mockClear();
    callRpc.mockImplementation(async (fn: string) => (fn === 'list_translation_overrides' ? [] : undefined));
    store.setTranslationOverride(W, 'xin chào', 'userA');
    await vi.waitFor(() => expect(callRpc).toHaveBeenCalledWith('set_translation_override', { p_word_id: ID, p_translation: 'xin chào' }));
    store.clearTranslationOverride(W, 'userA');
    await vi.waitFor(() => expect(callRpc).toHaveBeenCalledWith('clear_translation_override', { p_word_id: ID }));
    callRpc.mockClear();
    await sync.syncTranslationOverrides('userA');
    expect(callRpc.mock.calls.map((c) => c[0])).toContain('list_translation_overrides');
  });

  it('last-write-wins on updated_at: newer server beats older local; newer local beats older server; tombstones too', async () => {
    const { sync } = await mods();
    const old = '2026-11-22T01:00:00Z';
    const mid = Date.parse('2026-11-22T02:00:00Z');
    const remote = [{ word_id: ID, translation: 'server', updated_at: old }];
    // newer local wins -> push
    expect(sync.planMerge({ [ID]: 'local' }, { [ID]: { t: mid } }, remote)).toEqual({ applyLocal: [], push: [{ id: ID, text: 'local' }] });
    // newer server wins -> apply
    const newer = [{ word_id: ID, translation: 'server', updated_at: '2026-11-22T03:00:00Z' }];
    expect(sync.planMerge({ [ID]: 'local' }, { [ID]: { t: mid } }, newer).applyLocal).toEqual([{ id: ID, text: 'server', t: Date.parse('2026-11-22T03:00:00Z') }]);
    // legacy local value without a stamp loses to the server
    expect(sync.planMerge({ [ID]: 'local' }, {}, remote).applyLocal[0]?.text).toBe('server');
    // newer local clear pushes a clear; older local clear loses
    expect(sync.planMerge({}, { [ID]: { t: mid, d: true } }, remote).push).toEqual([{ id: ID, text: '' }]);
    expect(sync.planMerge({}, { [ID]: { t: 1, d: true } }, remote).applyLocal[0]?.text).toBe('server');
    // server-only row is pulled; local-only row is pushed
    expect(sync.planMerge({}, {}, remote).applyLocal).toHaveLength(1);
    expect(sync.planMerge({ [ID]: 'only here' }, { [ID]: { t: mid } }, []).push).toHaveLength(1);
  });

  it('sync applies a newer server row to local storage and refreshes open cards (remote event)', async () => {
    const { store, sync } = await mods();
    const seen: string[] = [];
    window.addEventListener(store.TRANSLATION_OVERRIDE_EVENT, (e) => seen.push((e as CustomEvent).detail.source));
    callRpc.mockResolvedValueOnce([{ word_id: ID, translation: 'từ máy chủ', updated_at: '2026-11-22T03:00:00Z' }]);
    await sync.syncTranslationOverrides('userA');
    expect(store.getTranslationOverride(W, 'userA')).toBe('từ máy chủ');
    expect(seen).toContain('remote');
    expect(callRpc).toHaveBeenCalledTimes(1); // pulled value is never pushed back
  });

  it('RPC failure is swallowed and local data is kept (and retried on the next sync because local is newer)', async () => {
    const { store, sync } = await mods();
    callRpc.mockRejectedValue(new Error('relation does not exist'));
    store.setTranslationOverride(W, 'giữ lại', 'userA');
    await expect(sync.syncTranslationOverrides('userA')).resolves.toBeUndefined();
    await expect(sync.pushOverride('userA', ID, 'giữ lại')).resolves.toBe(false);
    expect(store.getTranslationOverride(W, 'userA')).toBe('giữ lại');
    // next sync: server is empty, local is newer -> pushes it
    callRpc.mockReset();
    callRpc.mockImplementation(async (fn: string) => (fn === 'list_translation_overrides' ? [] : undefined));
    await sync.syncTranslationOverrides('userA');
    expect(callRpc).toHaveBeenCalledWith('set_translation_override', { p_word_id: ID, p_translation: 'giữ lại' });
  });

  it('storage that throws is swallowed during sync', async () => {
    const { store, sync } = await mods();
    callRpc.mockResolvedValueOnce([{ word_id: ID, translation: 'x', updated_at: '2026-11-22T03:00:00Z' }]);
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await expect(sync.syncTranslationOverrides('userA')).resolves.toBeUndefined();
    expect(() => store.setTranslationOverride(W, 'y', 'userA')).not.toThrow();
    spy.mockRestore();
  });

  it('shared vocabulary records are never touched by sync', async () => {
    const { sync } = await mods();
    const shared = { ...W, translation: 'gốc' };
    const snap = JSON.stringify(shared);
    callRpc.mockResolvedValueOnce([{ word_id: ID, translation: 'override', updated_at: '2026-11-22T03:00:00Z' }]);
    await sync.syncTranslationOverrides('userA');
    expect(JSON.stringify(shared)).toBe(snap);
  });
});
