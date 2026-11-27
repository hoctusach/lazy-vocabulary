// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react';

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/features/admin/adminApi', async (orig) => ({ ...(await orig<Record<string, unknown>>()), syncImportedSets: vi.fn(async () => {}), deleteImportedSetRemote: vi.fn(async () => {}), fetchIsAdmin: async () => false }));

import { allocateQuotas, pickByQuota, takeByQuota } from '@/features/word-sets/dailyMix';
import { VocabularySetProvider, useVocabularySets } from '@/features/word-sets/VocabularySetContext';
import VocabularySetsScreen from '@/features/word-sets/VocabularySetsScreen';
import { builtinSourceId, localDateKey } from '@/features/word-sets/vocabularySetStore';
import { PLAN_NOTICE, TODAY_PLAN_KEY } from '@/features/word-sets/todayPlan';
import { MAX_TOTAL } from '@/lib/progress/dailyTarget';

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

describe('[FB-63] proportional split of a new day (pure, stubbed sizes)', () => {
  it('largest source gets more; total is 20; a single source gets all 20', () => {
    const q = allocateQuotas([{ id: 'big', size: 3000 }, { id: 'mid', size: 600 }, { id: 'small', size: 400 }], 20);
    expect(sum(q)).toBe(20);
    expect(q.big).toBeGreaterThan(q.mid);
    expect(q.mid).toBeGreaterThanOrEqual(q.small);
    expect(q.big).toBe(15); // 3000/4000 of 20
    expect(allocateQuotas([{ id: 'only', size: 500 }], 20)).toEqual({ only: 20 });
    expect(allocateQuotas([{ id: 'only', size: 12 }], 20)).toEqual({ only: 12 }); // never more words than the set has
  });
  it('a tiny set (with or without Due words) still gets a slot, so it never starves behind a big one', () => {
    const withDue = allocateQuotas([{ id: 'big', size: 3000 }, { id: 'tiny', size: 5, due: 2 }], 20);
    expect(withDue.tiny).toBeGreaterThanOrEqual(1);
    expect(sum(withDue)).toBe(20);
    const noDue = allocateQuotas([{ id: 'big', size: 3000 }, { id: 'tiny', size: 5 }], 20);
    expect(noDue.tiny).toBeGreaterThanOrEqual(1);
    expect(noDue.big).toBeGreaterThan(noDue.tiny * 5);
    expect(sum(noDue)).toBe(20);
    // more sources than slots: only sources with Due words are guaranteed one
    const many = allocateQuotas(Array.from({ length: 30 }, (_, i) => ({ id: `s${i}`, size: 10, due: i === 29 ? 1 : 0 })), 20);
    expect(sum(many)).toBeLessThanOrEqual(25);
    expect(many.s29).toBeGreaterThanOrEqual(1);
  });
  it('slots a short source cannot fill go to the others; total never above 25; due-first order inside a source is kept', () => {
    const q = allocateQuotas([{ id: 'a', size: 8 }, { id: 'b', size: 1000 }], 20);
    expect(q.a).toBeLessThanOrEqual(8);
    expect(sum(q)).toBe(20);
    const lists = [
      { id: 'a', words: ['a-due1', 'a-due2', 'a-new1'] },
      { id: 'b', words: Array.from({ length: 40 }, (_, i) => (i < 3 ? `b-due${i}` : `b-new${i}`)) },
    ];
    const per = takeByQuota(lists, { a: 3, b: 5 }, 20);
    expect(per.a).toEqual(['a-due1', 'a-due2', 'a-new1']);
    expect(per.b.slice(0, 3)).toEqual(['b-due0', 'b-due1', 'b-due2']);
    expect(per.a.length + per.b.length).toBe(20); // b fills the unused slots
    expect(pickByQuota(lists, { a: 3, b: 5 }, 99).length).toBeLessThanOrEqual(MAX_TOTAL);
  });
});

describe('[FB-63] ticking sets does not change today; the next day uses the new selection', () => {
  let api: ReturnType<typeof useVocabularySets>;
  const Grab = () => { api = useVocabularySets(); return null; };
  const rows = (name: string, n: number) => ({ idioms: Array.from({ length: n }, (_, i) => ({ word: `${name}${i}`, meaning: 'm', example: '', category: 'idioms', count: 0 })) });

  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); localStorage.clear(); toast.info.mockClear(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("untick keeps today's plan, queues and stats; the Library shows the notice; a new day applies the selection", async () => {
    render(<VocabularySetProvider><Grab /><VocabularySetsScreen /></VocabularySetProvider>);
    await act(async () => { api.importSet('alpha', rows('alpha', 30)); api.importSet('beta', rows('beta', 60)); });
    const a = api.sets.find((s) => s.name === 'alpha')!.id;
    const b = api.sets.find((s) => s.name === 'beta')!.id;
    const planBefore = [...api.planSources];
    expect(planBefore).toEqual(expect.arrayContaining([a, b, builtinSourceId('idioms')])); // new sets joined today
    expect(api.importedQueues.map((q) => q.sourceId).sort()).toEqual([a, b].sort());
    const queueA = api.importedQueues.find((q) => q.sourceId === a)!.words.map((w) => w.word);

    // untick alpha and every built-in group in the Library
    await act(async () => { api.setBuiltinAll(false); });
    fireEvent.click(screen.getByLabelText('Include alpha'));
    expect(toast.info).toHaveBeenCalledWith('Changes apply from tomorrow.');
    expect(api.selectedSources).toEqual([b]);
    expect(api.planSources).toEqual(planBefore); // today is untouched
    expect(api.planHasBuiltin).toBe(true);
    expect(api.importedQueues.find((q) => q.sourceId === a)!.words.map((w) => w.word)).toEqual(queueA);
    expect(api.planDiffers).toBe(true);
    expect(screen.getByTestId('plan-note').textContent).toBe(PLAN_NOTICE);

    // the next local day: rebuilt from the CURRENT selection (only beta)
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    vi.setSystemTime(tomorrow);
    await act(async () => { api.refresh(); });
    expect(api.planSources).toEqual([b]);
    expect(api.importedQueues.map((q) => q.sourceId)).toEqual([b]);
    expect(api.planHasBuiltin).toBe(false);
    expect(JSON.parse(localStorage.getItem(TODAY_PLAN_KEY)!).date).toBe(localDateKey(tomorrow));
    expect(api.planDiffers).toBe(false);
  });

  it('ticking a set ON later today does not add it to today either; deleting a set removes it from the plan', async () => {
    render(<VocabularySetProvider><Grab /></VocabularySetProvider>);
    await act(async () => { api.importSet('gamma', rows('gamma', 10)); });
    const g = api.sets.find((s) => s.name === 'gamma')!.id;
    await act(async () => { api.toggleSource(g); }); // off
    await act(async () => { api.toggleSource(g); }); // on again: same day, plan never changed
    expect(api.planSources).toContain(g);
    await act(async () => { api.remove(g); });
    expect(api.planSources).not.toContain(g);
    expect(api.planSources).toContain(builtinSourceId('idioms'));
  });

  it('a planned set whose data vanished from storage falls back to the live selection (built-in)', async () => {
    const first = render(<VocabularySetProvider><Grab /></VocabularySetProvider>);
    await act(async () => { api.importSet('ghost', rows('ghost', 5)); });
    const g = api.sets.find((s) => s.name === 'ghost')!.id;
    await act(async () => { api.setBuiltinAll(false); });
    await act(async () => { window.dispatchEvent(new Event('lv:new-day')); }); // today = [ghost] only
    expect(api.planSources).toEqual([g]);
    first.unmount();
    localStorage.removeItem(`lv.vocabularySets.data.${g}`);
    render(<VocabularySetProvider><Grab /></VocabularySetProvider>);
    expect(api.planSources).not.toContain(g);
    expect(api.planHasBuiltin).toBe(true);
  });
});
