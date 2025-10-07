import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockReadSpeechRate = vi.fn<[], number | null>();
const mockWriteSpeechRate = vi.fn<[number], void>();

vi.mock('@/lib/localPreferences', () => ({
  getSpeechRate: mockReadSpeechRate,
  setSpeechRate: mockWriteSpeechRate,
}));

const importSpeechSettings = () =>
  import('@/utils/speech/core/speechSettings');

describe('speechSettings', () => {
  beforeEach(() => {
    vi.resetModules();
    mockReadSpeechRate.mockReset();
    mockWriteSpeechRate.mockReset();
  });

  it('returns the stored speech rate when available', async () => {
    mockReadSpeechRate.mockReturnValue(1.25);
    const { getSpeechRate } = await importSpeechSettings();

    expect(getSpeechRate()).toBe(1.25);
    expect(getSpeechRate()).toBe(1.25);
    expect(mockReadSpeechRate).toHaveBeenCalledTimes(1);
  });

  it('falls back to the default rate when storage is empty', async () => {
    mockReadSpeechRate.mockReturnValue(null);
    const { getSpeechRate } = await importSpeechSettings();
    const { DEFAULT_SPEECH_RATE } = await import('@/services/speech/core/constants');

    expect(getSpeechRate()).toBe(DEFAULT_SPEECH_RATE);
    expect(mockReadSpeechRate).toHaveBeenCalledTimes(1);
  });

  it('persists and caches updates when the rate changes', async () => {
    mockReadSpeechRate.mockReturnValue(0.8);
    const { getSpeechRate, setSpeechRate } = await importSpeechSettings();

    expect(getSpeechRate()).toBe(0.8);
    mockReadSpeechRate.mockClear();

    setSpeechRate(1.5);

    expect(mockWriteSpeechRate).toHaveBeenCalledWith(1.5);
    expect(getSpeechRate()).toBe(1.5);
    // Should not re-read from storage after caching the new value
    expect(mockReadSpeechRate).not.toHaveBeenCalled();
  });
});
