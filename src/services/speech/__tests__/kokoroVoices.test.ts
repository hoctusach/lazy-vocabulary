import { describe, it, expect } from 'vitest';
import { KOKORO_VOICES, getKokoroVoiceByName, isKokoroVoiceName, mapRateToKokoroSpeed, KOKORO_DOWNLOAD_BYTES } from '../kokoro/kokoroVoices';

const [heart, michael] = KOKORO_VOICES;

describe('[FB-03][FB-04] kokoroVoices', () => {
  it('lists Heart (female, default) first, then Michael', () => {
    expect(KOKORO_VOICES.map((v) => v.id)).toEqual(['af_heart', 'am_michael']);
    expect(heart.baseSpeed).toBe(0.95);
    expect(michael.baseSpeed).toBe(1.0);
  });
  it('maps the default rate to the base speed and scales linearly', () => {
    expect(mapRateToKokoroSpeed(0.8, heart)).toBeCloseTo(0.95);
    expect(mapRateToKokoroSpeed(0.8, michael)).toBeCloseTo(1.0);
    expect(mapRateToKokoroSpeed(1.6, heart)).toBeCloseTo(1.9);
  });
  it('clamps to 0.5..2.0 and handles non-finite rates', () => {
    expect(mapRateToKokoroSpeed(0.1, heart)).toBe(0.5);
    expect(mapRateToKokoroSpeed(10, michael)).toBe(2);
    expect(mapRateToKokoroSpeed(NaN, heart)).toBe(heart.baseSpeed);
    expect(mapRateToKokoroSpeed(Infinity, michael)).toBe(michael.baseSpeed);
  });
  it('detects Kokoro voice names', () => {
    expect(isKokoroVoiceName('Kokoro Heart (US female)')).toBe(true);
    expect(isKokoroVoiceName('kokoro:am_michael')).toBe(true);
    expect(isKokoroVoiceName('Google US English')).toBe(false);
    expect(isKokoroVoiceName(null)).toBe(false);
    expect(getKokoroVoiceByName('Kokoro Michael (US male)')?.sid).toBe(16);
    expect(KOKORO_DOWNLOAD_BYTES).toBe(332562608);
  });
});
