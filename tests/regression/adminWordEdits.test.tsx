// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const rpc = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('@/lib/progress/friends', () => ({ callFriendsRpc: (...a: unknown[]) => rpc.fn(...a) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }));

import AdminWordEditor from '@/features/admin/AdminWordEditor';
import AdminImportedSets from '@/features/admin/AdminImportedSets';
import { __resetAdminForTests, fetchIsAdmin, saveOfficialWord, syncImportedSets } from '@/features/admin/adminApi';
import { VocabularySetProvider } from '@/features/word-sets/VocabularySetContext';

const card = <AdminWordEditor word="give up" meaning="to stop" example="Never give up." translation="bỏ" category="phrasal verbs" />;
const setup = (impl: (fn: string, args?: unknown) => unknown) => {
  rpc.fn.mockReset();
  rpc.fn.mockImplementation(async (fn: string, args?: unknown) => impl(fn, args));
};
const called = (name: string) => rpc.fn.mock.calls.filter((c) => c[0] === name);

beforeEach(() => { localStorage.clear(); __resetAdminForTests(); });
afterEach(cleanup);

describe('[FB-55] admin flag comes only from the server', () => {
  it('non-admin (RPC false): no edit control', async () => {
    setup(() => false);
    render(card);
    await waitFor(() => expect(called('admin_whoami')).toHaveLength(1));
    expect(screen.queryByTestId('admin-edit-word')).toBeNull();
  });
  it('RPC failure / missing function = hidden, no crash', async () => {
    setup(() => { throw new Error('404 function not found'); });
    render(card);
    await waitFor(() => expect(called('admin_whoami')).toHaveLength(1));
    expect(screen.queryByTestId('admin-edit-word')).toBeNull();
    expect(await fetchIsAdmin()).toBe(false);
  });
  it('a localStorage flag or a query param does not make anyone admin', async () => {
    setup(() => false);
    localStorage.setItem('isAdmin', 'true');
    window.history.replaceState({}, '', '/?isAdmin=1');
    render(card);
    await waitFor(() => expect(called('admin_whoami')).toHaveLength(1));
    expect(screen.queryByTestId('admin-edit-word')).toBeNull();
    window.history.replaceState({}, '', '/');
  });
  it('admin (RPC true): control is shown', async () => {
    setup(() => true);
    render(card);
    expect(await screen.findByTestId('admin-edit-word')).toBeTruthy();
  });
});

describe('[FB-55] official word edit', () => {
  it('saves through the RPC with the six-category select and does not touch defaultVocabulary', async () => {
    setup((fn) => (fn === 'admin_whoami' ? true : null));
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(card);
    await userEvent.click(await screen.findByTestId('admin-edit-word'));
    const sel = screen.getByLabelText('Category') as HTMLSelectElement;
    expect([...sel.options].map((o) => o.value)).toEqual(['topic vocab', 'phrasal verbs', 'idioms', 'grammar', 'phrases, collocations', 'word formation']);
    await userEvent.selectOptions(sel, 'idioms');
    const meaning = screen.getByLabelText('Meaning');
    await userEvent.clear(meaning); await userEvent.type(meaning, 'to quit');
    await userEvent.click(screen.getByTestId('admin-save'));
    await waitFor(() => expect(called('admin_update_official_word')).toHaveLength(1));
    expect(called('admin_update_official_word')[0][1]).toMatchObject({ p_word: 'give up', p_category: 'phrasal verbs', p_meaning: 'to quit', p_new_category: 'idioms' });
    expect(setItem.mock.calls.some((c) => /defaultVocabulary/i.test(String(c[0])))).toBe(false);
    setItem.mockRestore();
  });
  it('shows an inline error when the server rejects, and validates the category', async () => {
    setup((fn) => { if (fn === 'admin_whoami') return true; throw new Error('not allowed'); });
    render(card);
    await userEvent.click(await screen.findByTestId('admin-edit-word'));
    await userEvent.click(screen.getByTestId('admin-save'));
    expect((await screen.findByTestId('admin-error')).textContent).toMatch(/not allowed/i);
    await expect(saveOfficialWord({ word: 'a', category: 'idioms' }, { word: 'a', meaning: 'b', example: '', translation: '', category: 'my words' })).rejects.toThrow(/category/i);
  });
});

describe('[FB-55] browse every user\'s imported sets', () => {
  const mount = () => render(<VocabularySetProvider><AdminImportedSets /></VocabularySetProvider>);
  it('is never requested for a non-admin', async () => {
    setup(() => false);
    mount();
    await waitFor(() => expect(called('admin_whoami')).toHaveLength(1));
    await new Promise((r) => setTimeout(r, 20));
    expect(called('admin_list_imported_sets')).toHaveLength(0);
    expect(screen.queryByTestId('admin-sets-card')).toBeNull();
  });
  it('admin sees owner + set + word count and can study one locally', async () => {
    setup((fn) => {
      if (fn === 'admin_whoami') return true;
      if (fn === 'admin_list_imported_sets') return [{ id: 'u1', owner_nickname: 'Mai', name: 'Travel', word_count: 12 }];
      if (fn === 'admin_get_imported_set') return [{ id: 'u1', owner_nickname: 'Mai', name: 'Travel', sheets: { idioms: [{ word: 'a piece of cake', meaning: 'easy', example: '', count: 0, category: 'idioms' }] } }];
      return null;
    });
    mount();
    expect((await screen.findByText(/Mai · Travel · 12 words/)).textContent).toBeTruthy();
    await userEvent.click(screen.getByText('Study'));
    await waitFor(() => expect(called('admin_get_imported_set')).toHaveLength(1));
    await waitFor(() => expect(Object.keys(localStorage).some((k) => k.startsWith('lv.vocabularySets.data.'))).toBe(true));
    expect(called('sync_imported_set')).toHaveLength(0); // the owner's copy is untouched
  });
  it('admin list failing (table missing) shows an empty panel, no crash', async () => {
    setup((fn) => { if (fn === 'admin_whoami') return true; throw new Error('relation does not exist'); });
    mount();
    expect(await screen.findByText('No sets found.')).toBeTruthy();
  });
  it('device sync uploads own sets best-effort and swallows errors', async () => {
    setup(() => { throw new Error('404'); });
    await expect(syncImportedSets([{ id: 's1', name: 'A', sheets: {} }, { id: 's2', name: 'B', sheets: {} }])).resolves.toBeUndefined();
    expect(called('sync_imported_set')).toHaveLength(1); // stops after the first failure
  });
});
