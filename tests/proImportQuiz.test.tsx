/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }) }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

import { VocabularySetProvider } from '@/features/word-sets/VocabularySetContext';
import VocabularySetsScreen from '@/features/word-sets/VocabularySetsScreen';
import { importVocabularySet, setSelectedSources } from '@/features/word-sets/vocabularySetStore';
import QuickQuizPanel from '@/components/vocabulary-app/QuickQuizPanel';
import { canStartQuiz, localDayKey, quizSessionsToday, recordQuizStart } from '@/features/quiz/quizService';
import * as ent from '@/services/billing/entitlement';
import { getProUpgradeState, __resetProUpgradeForTests } from '@/services/billing/proUpgradeStore';

beforeEach(() => {
  vi.stubEnv('VITE_ENABLE_PRO', 'true');
  localStorage.clear();
  ent.__resetEntitlementForTests();
  __resetProUpgradeForTests();
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('[FB-06] word-set import gating', () => {
  const sheets = { General: [{ word: 'alpha', meaning: 'first', example: 'alpha ex', translation: '', category: 'General' }] };
  const mount = () => render(<VocabularySetProvider><VocabularySetsScreen /></VocabularySetProvider>);

  it('free user: Choose file is locked (badge) and opens the upgrade sheet instead of the picker', () => {
    mount();
    const btn = screen.getByRole('button', { name: /Choose file/ });
    expect(btn.getAttribute('data-locked')).toBe('true');
    expect(btn.querySelector('[aria-label="Pro feature"]')).toBeTruthy();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, 'click');
    fireEvent.click(btn);
    expect(click).not.toHaveBeenCalled();
    expect(getProUpgradeState()).toMatchObject({ open: true, feature: 'importSets' });
  });

  it('free user: a file forced into the input is refused, no set is created', async () => {
    mount();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['word,meaning\na,b'], 'x.csv', { type: 'text/csv' });
    await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
    expect(getProUpgradeState().feature).toBe('importSets');
    expect(screen.queryByText('x')).toBeNull();
    expect(localStorage.getItem('lv.vocabularySets.meta')).toBeNull();
  });

  it('Pro user: Choose file opens the picker, no badge', () => {
    ent.setProEntitlement();
    mount();
    const btn = screen.getByRole('button', { name: /Choose file/ });
    expect(btn.getAttribute('data-locked')).toBe('false');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, 'click');
    fireEvent.click(btn);
    expect(click).toHaveBeenCalled();
    expect(getProUpgradeState().open).toBe(false);
  });

  it('existing imported sets stay listed, selectable and deletable for a free (lapsed) user', () => {
    ent.setProEntitlement();
    const res = importVocabularySet('My list', sheets, 'my.csv');
    expect(res.ok).toBe(true);
    ent.clearProEntitlement(); // refund / never Pro
    mount();
    expect(screen.getByText('My list')).toBeTruthy();
    const box = screen.getByRole('checkbox', { name: /My list/ }) as HTMLInputElement;
    expect(box.checked).toBe(true);
    fireEvent.click(box); // deselect works
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(box.checked).toBe(true);
    const del = screen.getAllByRole('button', { name: /Delete/ })[0];
    expect((del as HTMLButtonElement).disabled).toBe(false);
    void setSelectedSources;
  });

  it('flag off: import is not locked', () => {
    vi.stubEnv('VITE_ENABLE_PRO', 'false');
    mount();
    expect(screen.getByRole('button', { name: /Choose file/ }).getAttribute('data-locked')).toBe('false');
  });
});

describe('[FB-06] Quiz me: 1 per local day for free', () => {
  it('local day key uses the device-local date, not UTC', () => {
    const d = new Date(2026, 10, 21, 23, 59, 0); // local 23:59
    expect(localDayKey(d)).toBe('2026-11-21');
  });

  it('service: 2nd same-day start blocked, next day allowed, Pro unlimited', () => {
    const day1 = new Date(2026, 10, 21, 9, 0);
    expect(canStartQuiz(false, day1)).toBe(true);
    recordQuizStart(day1);
    expect(quizSessionsToday(day1)).toBe(1);
    expect(canStartQuiz(false, new Date(2026, 10, 21, 23, 59))).toBe(false);
    expect(canStartQuiz(true, day1)).toBe(true);
    expect(canStartQuiz(false, new Date(2026, 10, 22, 0, 1))).toBe(true);
    expect(quizSessionsToday(new Date(2026, 10, 22, 0, 1))).toBe(0);
  });

  it('[FB-22] service tolerates corrupt / blocked storage', () => {
    localStorage.setItem('lazyVoca.quiz.daily.v1', '{not json');
    expect(canStartQuiz(false)).toBe(true);
    const s = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(canStartQuiz(false)).toBe(true);
    s.mockRestore();
  });

  const words = Array.from({ length: 12 }, (_, i) => ({
    word: `w${i}`, meaning: `m${i}`, example: `e${i}`, translation: '', category: 'c', count: 0,
  }));
  const quizMe = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Quiz me' }));
    const close = screen.queryByRole('button', { name: /close/i });
    if (close) fireEvent.click(close); // modal quiz dialog would hide the button from the next click
  };
  const panel = () => render(<QuickQuizPanel targetWords={words as never} />);

  it('panel: first quiz starts, second opens the upgrade sheet with the quiz trigger', () => {
    panel();
    fireEvent.click(screen.getByRole('button', { name: 'Quiz me' }));
    expect(screen.getByText(/Question 1 of/)).toBeTruthy();
    expect(quizSessionsToday()).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Quiz me' }));
    expect(getProUpgradeState()).toMatchObject({ open: true, feature: 'unlimitedQuiz' });
    expect(quizSessionsToday()).toBe(1);
  });

  it('panel: next local day allows a new quiz', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 21, 10, 0));
    panel();
    quizMe();
    vi.setSystemTime(new Date(2026, 10, 22, 8, 0));
    quizMe();
    expect(getProUpgradeState().open).toBe(false);
    expect(quizSessionsToday()).toBe(1);
  });

  it('panel: Pro is unlimited', () => {
    ent.setProEntitlement();
    panel();
    for (let i = 0; i < 3; i++) {
      quizMe();
      expect(getProUpgradeState().open).toBe(false);
    }
  });

  it('panel: flag off is unlimited and never opens the sheet', () => {
    vi.stubEnv('VITE_ENABLE_PRO', 'false');
    panel();
    for (let i = 0; i < 3; i++) quizMe();
    expect(getProUpgradeState().open).toBe(false);
  });
});
