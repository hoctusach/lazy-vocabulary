// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }));

import { VocabularySetProvider } from '@/features/word-sets/VocabularySetContext';
import VocabularySetsScreen from '@/features/word-sets/VocabularySetsScreen';
import { validateManualWord, MANUAL_SET_MAX_WORDS, manualKey } from '@/features/word-sets/manualSet';
import {
  addManualWord, createManualSet, getSetSheets, listVocabularySets, removeManualWord, updateManualWord, flattenSheets,
} from '@/features/word-sets/vocabularySetStore';
import * as ent from '@/services/billing/entitlement';
import { getProUpgradeState, __resetProUpgradeForTests } from '@/services/billing/proUpgradeStore';

beforeEach(() => {
  vi.stubEnv('VITE_ENABLE_PRO', 'true');
  localStorage.clear();
  ent.__resetEntitlementForTests();
  __resetProUpgradeForTests();
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

const mount = () => render(<VocabularySetProvider><VocabularySetsScreen /></VocabularySetProvider>);
const type = async (label: string, text: string) => { await userEvent.type(screen.getByLabelText(label), text); };

describe('[FB-57] category is one of the six built-in names', () => {
  const SIX = ['topic vocab', 'phrasal verbs', 'idioms', 'grammar', 'phrases, collocations', 'word formation'];
  it('the list is exactly the six C1/C2 groups and matches BUILTIN_GROUPS', async () => {
    const { MANUAL_CATEGORIES } = await import('@/features/word-sets/manualSet');
    const { BUILTIN_GROUPS } = await import('@/features/word-sets/vocabularySetStore');
    expect([...MANUAL_CATEGORIES]).toEqual(SIX);
    expect([...BUILTIN_GROUPS]).toEqual(SIX);
  });
  it('accepts each of the six (case-insensitive input becomes the canonical string) and rejects anything else', () => {
    for (const c of SIX) expect(validateManualWord({ word: 'w', meaning: 'm', category: c }, [])).toMatchObject({ ok: true, word: { category: c } });
    expect(validateManualWord({ word: 'w', meaning: 'm', category: ' IDIOMS ' }, [])).toMatchObject({ ok: true, word: { category: 'idioms' } });
    for (const bad of ['my words', 'greetings', 'phrases', 'collocations']) {
      expect(validateManualWord({ word: 'w', meaning: 'm', category: bad }, [])).toMatchObject({ ok: false, errors: { category: expect.any(String) } });
    }
  });
  it('the Create dialog and the add/edit form use a <select> of exactly those six, preselecting topic vocab', async () => {
    mount();
    await userEvent.click(screen.getByTestId('new-set-button'));
    const sel = screen.getByTestId('manual-category') as HTMLSelectElement;
    expect(sel.tagName).toBe('SELECT');
    expect([...sel.options].map((o) => o.value)).toEqual(SIX);
    expect(sel.value).toBe('topic vocab');
    expect(document.querySelector('input#manual-category')).toBeNull(); // no free-text category
    await type('Set name', 'Cats');
    await type('Word', 'tabby');
    await type('Meaning', 'a cat');
    await userEvent.selectOptions(sel, 'idioms');
    await userEvent.click(screen.getByTestId('create-set-submit'));
    const id = listVocabularySets().find((s) => s.name === 'Cats')!.id;
    expect(flattenSheets(getSetSheets(id))[0]).toMatchObject({ word: 'tabby', category: 'idioms' });
    // add one by one: the select is there too; edit an existing word and change its category
    const dlg = await screen.findByTestId('manage-set-dialog');
    const add = within(dlg).getByTestId('manual-category') as HTMLSelectElement;
    expect([...add.options].map((o) => o.value)).toEqual(SIX);
    await userEvent.click(within(dlg).getByLabelText('Edit tabby'));
    const edit = within(dlg).getByTestId('manual-category') as HTMLSelectElement;
    expect(edit.value).toBe('idioms');
    await userEvent.selectOptions(edit, 'grammar');
    await userEvent.click(within(dlg).getByTestId('manual-word-submit'));
    expect(flattenSheets(getSetSheets(id))[0]).toMatchObject({ word: 'tabby', category: 'grammar' });
  });
});

describe('[FB-45] validation (pure)', () => {
  it('requires word and meaning, trims everything, defaults the category to topic vocab', () => {
    const r = validateManualWord({ word: '  hello  ', meaning: ' xin chào ', example: '  hi ', translation: ' t ' }, []);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.word).toMatchObject({ word: 'hello', meaning: 'xin chào', example: 'hi', translation: 't', category: 'topic vocab' });
    expect(validateManualWord({ word: '   ', meaning: 'x' }, [])).toMatchObject({ ok: false, errors: { word: expect.any(String) } });
    expect(validateManualWord({ word: 'a', meaning: '  ' }, [])).toMatchObject({ ok: false, errors: { meaning: expect.any(String) } });
  });
  it('rejects junk word / meaning / category and over-long fields', () => {
    expect(validateManualWord({ word: '!!!', meaning: 'x' }, [])).toMatchObject({ ok: false, errors: { word: expect.stringMatching(/letter or number/) } });
    expect(validateManualWord({ word: 'a', meaning: '???' }, [])).toMatchObject({ ok: false, errors: { meaning: expect.any(String) } });
    expect(validateManualWord({ word: 'a', meaning: 'b', category: '---' }, [])).toMatchObject({ ok: false, errors: { category: expect.any(String) } });
    expect(validateManualWord({ word: 'a', meaning: 'b', category: 'my words' }, [])).toMatchObject({ ok: false, errors: { category: expect.any(String) } });
    expect(validateManualWord({ word: 'a'.repeat(101), meaning: 'b' }, [])).toMatchObject({ ok: false, errors: { word: expect.stringMatching(/100/) } });
    expect(validateManualWord({ word: 'a', meaning: 'b'.repeat(501) }, [])).toMatchObject({ ok: false, errors: { meaning: expect.stringMatching(/500/) } });
    expect(validateManualWord({ word: 'a', meaning: 'b', category: 'c'.repeat(41) }, [])).toMatchObject({ ok: false, errors: { category: expect.any(String) } });
    expect(validateManualWord({ word: 'a', meaning: 'b', translation: 't'.repeat(501) }, [])).toMatchObject({ ok: false, errors: { translation: expect.any(String) } });
    expect(validateManualWord({ word: 'a', meaning: 'b', example: 'e'.repeat(1001) }, [])).toMatchObject({ ok: false, errors: { example: expect.any(String) } });
  });
  it('rejects a duplicate word+category (case-insensitive) but allows the same word in another category', () => {
    const existing = [{ word: 'Hello', category: 'topic vocab' }];
    expect(validateManualWord({ word: ' hello ', meaning: 'x' }, existing)).toMatchObject({ ok: false, errors: { word: expect.stringMatching(/already/) } });
    expect(validateManualWord({ word: 'hello', meaning: 'x', category: 'idioms' }, existing).ok).toBe(true);
  });
});

describe('[FB-45] store: create / add / edit / remove, persisted', () => {
  it('empty set cannot be created: first word + name are required', () => {
    expect(createManualSet('', { word: 'a', meaning: 'b' })).toMatchObject({ ok: false, errors: { form: expect.any(String) } });
    expect(createManualSet('S', { word: '', meaning: '' })).toMatchObject({ ok: false });
    expect(listVocabularySets().filter((s) => !s.builtin)).toHaveLength(0);
  });
  it('creates, adds, rejects duplicates, edits, removes (not the last word), and persists', () => {
    const c = createManualSet('  My set ', { word: 'alpha', meaning: 'first' });
    expect(c.ok).toBe(true);
    const id = (c as { set: { id: string } }).set.id;
    expect(listVocabularySets().find((s) => s.id === id)).toMatchObject({ name: 'My set', manual: true, wordCount: 1 });
    expect(addManualWord(id, { word: 'beta', meaning: 'second', translation: 'thứ hai' }).ok).toBe(true);
    expect(addManualWord(id, { word: 'ALPHA', meaning: 'dup' })).toMatchObject({ ok: false });
    expect(listVocabularySets().find((s) => s.id === id)?.wordCount).toBe(2);
    expect(updateManualWord(id, manualKey('beta', 'topic vocab'), { word: 'beta', meaning: 'second!!', translation: '' }).ok).toBe(true);
    expect(flattenSheets(getSetSheets(id)).find((w) => w.word === 'beta')?.meaning).toBe('second!!');
    expect(removeManualWord(id, manualKey('beta', 'topic vocab')).ok).toBe(true);
    expect(removeManualWord(id, manualKey('alpha', 'topic vocab'))).toMatchObject({ ok: false, errors: { form: expect.stringMatching(/at least one word/) } });
    // survives a "reload": read straight from storage
    expect(flattenSheets(getSetSheets(id)).map((w) => w.word)).toEqual(['alpha']);
  });
  it('caps a set and says how to get more', () => {
    const c = createManualSet('Big', { word: 'w0', meaning: 'm' }) as { set: { id: string } };
    for (let i = 1; i < MANUAL_SET_MAX_WORDS; i++) expect(addManualWord(c.set.id, { word: `w${i}`, meaning: 'm' }).ok).toBe(true);
    expect(addManualWord(c.set.id, { word: 'over', meaning: 'm' })).toMatchObject({ ok: false, errors: { form: expect.stringMatching(/Import a file \(Pro\)/) } });
  });
});

describe('[FB-45] free user flow in the Sets screen (no upgrade sheet)', () => {
  it('free: create a set, add a word one by one, inline errors, persisted; import stays Pro', async () => {
    mount(); // free: VITE_ENABLE_PRO true and no entitlement
    await userEvent.click(screen.getByTestId('new-set-button'));
    // inline errors, not toasts
    await userEvent.click(screen.getByTestId('create-set-submit'));
    expect(screen.getByTestId('manual-word-error').textContent).toMatch(/Enter the word/);
    expect(screen.getByTestId('manual-meaning-error')).toBeTruthy();
    await type('Set name', 'Trip');
    await type('Word', 'ticket');
    await type('Meaning', 'a pass');
    await userEvent.click(screen.getByTestId('create-set-submit'));
    expect(getProUpgradeState().open).toBe(false);
    expect(listVocabularySets().find((s) => s.name === 'Trip')).toMatchObject({ manual: true, wordCount: 1 });
    // manage dialog opens: add a second word, then a duplicate
    const dlg = await screen.findByTestId('manage-set-dialog');
    await userEvent.type(within(dlg).getByLabelText('Word'), 'passport');
    await userEvent.type(within(dlg).getByLabelText('Meaning'), 'id for travel');
    await userEvent.click(within(dlg).getByTestId('manual-word-submit'));
    expect(within(dlg).getByTestId('manual-added').textContent).toContain('passport');
    await userEvent.type(within(dlg).getByLabelText('Word'), 'Passport');
    await userEvent.type(within(dlg).getByLabelText('Meaning'), 'dup');
    await userEvent.click(within(dlg).getByTestId('manual-word-submit'));
    expect(within(dlg).getByTestId('manual-word-error').textContent).toMatch(/already/);
    expect(listVocabularySets().find((s) => s.name === 'Trip')?.wordCount).toBe(2);
    expect(getProUpgradeState().open).toBe(false);
    // file import is still gated
    await userEvent.click(within(dlg).getByText('Done'));
    fireEvent.click(screen.getByRole('button', { name: /Choose file/ }));
    expect(getProUpgradeState()).toMatchObject({ open: true, feature: 'importSets' });
  });

  it('Pro users keep file import (picker opens, no upgrade sheet)', () => {
    ent.setProEntitlement();
    mount();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: /Choose file/ }));
    expect(click).toHaveBeenCalled();
    expect(getProUpgradeState().open).toBe(false);
  });
});
