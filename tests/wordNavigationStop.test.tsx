/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { useWordNavigation } from '../src/hooks/vocabulary-controller/core/useWordNavigation';

vi.mock('../src/services/speech/unifiedSpeechController', () => ({
  unifiedSpeechController: { stop: vi.fn() }
}));

import { unifiedSpeechController } from '../src/services/speech/unifiedSpeechController';

describe('useWordNavigation', () => {
  it('stops current speech when navigating to next word', () => {
    const words = [
      { word: 'one', meaning: '', example: '', category: 'c' },
      { word: 'two', meaning: '', example: '', category: 'c' }
    ];
    let index = 0;
    const setIndex = (i: number) => {
      index = i;
    };
    const isTransRef = { current: false };
    const lastChangeRef = { current: 0 };
    const clear = vi.fn();

    const { result } = renderHook(() =>
      useWordNavigation(words, index, setIndex, words[index], isTransRef, lastChangeRef, clear)
    );

    act(() => {
      result.current.goToNext();
    });

    expect((unifiedSpeechController.stop as any).mock.calls.length).toBeGreaterThan(0);
    expect(index).toBe(1);
  });
});
