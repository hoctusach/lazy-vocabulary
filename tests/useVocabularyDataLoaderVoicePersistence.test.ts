/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { useVocabularyDataLoader } from '@/hooks/vocabulary-controller/core/useVocabularyDataLoader';
import { setFavoriteVoice } from '@/lib/preferences/localPreferences';

vi.mock('@/lib/preferences/localPreferences', () => ({
  setFavoriteVoice: vi.fn()
}));

vi.mock('@/utils/lastWordStorage', () => ({
  getTodayLastWord: vi.fn(() => null)
}));

describe('useVocabularyDataLoader voice persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not persist empty voice selections', async () => {
    const setFavoriteVoiceMock = setFavoriteVoice as unknown as vi.Mock;

    const setWordList = vi.fn();
    const setHasData = vi.fn();
    const setCurrentIndex = vi.fn();
    const clearAutoAdvanceTimer = vi.fn();

    const { rerender } = renderHook(
      ({ voice }) =>
        useVocabularyDataLoader(
          setWordList,
          setHasData,
          setCurrentIndex,
          0,
          voice,
          clearAutoAdvanceTimer,
          []
        ),
      { initialProps: { voice: '' } }
    );

    await waitFor(() => {
      expect(setFavoriteVoiceMock).not.toHaveBeenCalled();
    });

    rerender({ voice: 'Voice Prime' });

    await waitFor(() => {
      expect(setFavoriteVoiceMock).toHaveBeenCalledWith('Voice Prime');
    });
  });
});
