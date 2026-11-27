// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/utils/deviceLanguage', () => ({ useIsVietnameseDevice: () => true, isVietnameseDevice: () => true }));
vi.mock('@/components/ThemeMascot', () => ({ default: () => null }));
vi.mock('@/components/vocabulary-app/WordCountDisplay', () => ({ default: () => null }));

const SHARED = 'dòng 1 gốc';

describe('[FB-33] Pro per-user translation edit (local storage)', () => {
  beforeEach(() => { vi.resetModules(); vi.stubEnv('VITE_ENABLE_PRO', 'true'); localStorage.clear(); });
  afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

  const card = async (over: Record<string, unknown> = {}) => {
    const { default: C } = await import('@/components/vocabulary-app/VocabularyCardNew');
    return render(<C word="give up" meaning="stop" example="x" translation={SHARED} backgroundColor="#fff" isSpeaking={false} category="Phrasal Verb" {...over} />);
  };
  const goPro = async () => (await import('@/services/billing/entitlement')).setProEntitlement();

  it('Pro: Edit makes the line an in-place multi-line textarea prefilled with the existing translation; save keeps line breaks', async () => {
    await goPro();
    await card();
    expect(screen.getByTestId('translation-text').textContent).toContain(SHARED);
    await userEvent.click(screen.getByTestId('translation-edit'));
    const ta = screen.getByTestId('translation-editor') as HTMLTextAreaElement;
    expect(ta.tagName).toBe('TEXTAREA');
    expect(ta.value).toBe(SHARED);
    expect(screen.queryByRole('dialog')).toBeNull(); // in place, no popup
    fireEvent.change(ta, { target: { value: 'một\nhai\nba' } });
    await userEvent.click(screen.getByTestId('translation-save'));
    const shown = screen.getByTestId('translation-text').parentElement!;
    expect(shown.textContent).toContain('một\nhai\nba');
    expect(getComputedStyle(shown).whiteSpace).toBe('pre-line');
    const { getTranslationOverride } = await import('@/lib/translations/translationOverrides');
    expect(getTranslationOverride({ word: 'give up', category: 'Phrasal Verb' })).toBe('một\nhai\nba');
  });

  it('the override is per user and never touches the shared word record', async () => {
    const m = await import('@/lib/translations/translationOverrides');
    const w = { word: 'give up', category: 'Phrasal Verb' };
    const shared = { ...w, translation: SHARED };
    const snapshot = JSON.stringify(shared);
    m.setTranslationOverride(w, 'của A', 'userA');
    expect(m.getTranslationOverride(w, 'userA')).toBe('của A');
    expect(m.getTranslationOverride(w, 'userB')).toBeUndefined();
    expect(JSON.stringify(shared)).toBe(snapshot);
    m.clearTranslationOverride(w, 'userA');
    expect(m.getTranslationOverride(w, 'userA')).toBeUndefined();
    // identity: same word in another category / set is a different override
    m.setTranslationOverride({ word: 'give up', category: 'Idioms' }, 'x', 'userA');
    expect(m.getTranslationOverride(w, 'userA')).toBeUndefined();
    m.setTranslationOverride({ ...w, sourceId: 'set-1' }, 'y', 'userA');
    expect(m.getTranslationOverride(w, 'userA')).toBeUndefined();
    expect(m.getTranslationOverride({ ...w, sourceId: 'default:idioms' }, 'userA')).toBeUndefined();
  });

  it('saved override is applied when the card renders again', async () => {
    const m = await import('@/lib/translations/translationOverrides');
    m.setTranslationOverride({ word: 'give up', category: 'Phrasal Verb' }, 'bản của tôi');
    await card();
    expect(screen.getByTestId('translation-text').textContent).toContain('bản của tôi');
  });

  it('free user: read-only text and a Pro lock that opens the upgrade sheet; no editor', async () => {
    await card();
    expect(screen.getByTestId('translation-text').textContent).toContain(SHARED);
    expect(screen.queryByTestId('translation-edit')).toBeNull();
    await userEvent.click(screen.getByTestId('translation-edit-locked'));
    expect(screen.queryByTestId('translation-editor')).toBeNull();
    const { getProUpgradeState } = await import('@/services/billing/proUpgradeStore');
    expect(getProUpgradeState()).toMatchObject({ open: true, feature: 'editTranslation' });
    expect((await import('@/services/billing/proFeatures')).hasFeature('editTranslation')).toBe(false);
  });

  it('survives storage that throws on read and write (FB-22)', async () => {
    const m = await import('@/lib/translations/translationOverrides');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    expect(m.getTranslationOverride({ word: 'a' })).toBeUndefined();
    expect(m.setTranslationOverride({ word: 'a' }, 'b')).toBe(false);
    await goPro().catch(() => {});
    await card();
    expect(screen.getByTestId('translation-text').textContent).toContain(SHARED);
    vi.restoreAllMocks();
  });

  it('typed text is kept when auto-advance swaps the card mid-edit', async () => {
    await goPro();
    const { rerender } = await card();
    await userEvent.click(screen.getByTestId('translation-edit'));
    fireEvent.change(screen.getByTestId('translation-editor'), { target: { value: 'dở dang' } });
    const { default: C } = await import('@/components/vocabulary-app/VocabularyCardNew');
    rerender(<C word="next word" meaning="m" example="x" translation="khác" backgroundColor="#fff" isSpeaking={false} category="Phrasal Verb" />);
    const m = await import('@/lib/translations/translationOverrides');
    expect(m.getTranslationOverride({ word: 'give up', category: 'Phrasal Verb' })).toBe('dở dang');
    expect(screen.queryByTestId('translation-editor')).toBeNull();
  });

  it('the shared default vocabulary data is not touched by the feature', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/lib/translations/translationOverrides.ts', 'utf8');
    expect(src).not.toMatch(/defaultVocabulary|default_vocabulary_base/);
  });

  it('cloud migration is marked APPLIED (do not re-run), with with forced RLS and no anon table grants', async () => {
    const { readFileSync } = await import('node:fs');
    const sql = readFileSync('supabase/sql/2026-11-22-user-translation-overrides.sql', 'utf8');
    expect(sql).toMatch(/STATUS: APPLIED 2026-11-22/);
    expect(sql).toMatch(/user_translation_overrides_2026_11_22/);
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(/revoke all on table public\.user_translation_overrides from public, anon, authenticated/);
    expect(sql).toContain('require_current_session_user_key()');
    expect(sql).not.toMatch(/grant (select|insert|update|delete)[^;]*on table/i);
  });
});
