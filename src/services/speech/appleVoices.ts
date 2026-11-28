/**
 * [FB-76] Preferred Apple (AVSpeechSynthesizer) voices on iOS, best first: Ava (Premium) is the female default, then Evan
 * (Enhanced) and Nathan (Enhanced) for a male voice. They only exist when the user downloaded them in
 * Settings > Accessibility > Spoken Content (iOS 26: Read & Speak) > Voices > English, so the list is also used to decide
 * whether to show the one-time "download better voices" hint.
 */
export interface AppleVoiceLike {
  voiceURI?: string;
  name: string;
  lang?: string;
}

export interface PreferredAppleVoice {
  id: string;
  name: string;
  quality: 'premium' | 'enhanced';
  gender: 'female' | 'male';
}

export const PREFERRED_APPLE_VOICES: readonly PreferredAppleVoice[] = [
  { id: 'com.apple.voice.premium.en-US.Ava', name: 'Ava', quality: 'premium', gender: 'female' },
  { id: 'com.apple.voice.enhanced.en-US.Evan', name: 'Evan', quality: 'enhanced', gender: 'male' },
  { id: 'com.apple.voice.enhanced.en-US.Nathan', name: 'Nathan', quality: 'enhanced', gender: 'male' },
];

const norm = (s: string | undefined) => (s ?? '').toLowerCase();

/** Match by voiceURI/identifier first, then by name + quality (the name is e.g. "Ava (Premium)" and/or the id carries `.premium.`). */
export function matchesPreferredApple(v: AppleVoiceLike, p: PreferredAppleVoice): boolean {
  const uri = norm(v.voiceURI);
  if (uri === p.id.toLowerCase()) return true;
  if (uri.includes(`.${p.quality}.`) && uri.endsWith(`.${p.name.toLowerCase()}`) && uri.includes('en-us')) return true;
  const name = norm(v.name);
  const lang = norm(v.lang).replace('_', '-');
  const nameOk = name === p.name.toLowerCase() || name.startsWith(`${p.name.toLowerCase()} (`) || name.startsWith(`${p.name.toLowerCase()} `);
  const qualityOk = name.includes(p.quality) || uri.includes(`.${p.quality}.`);
  return nameOk && qualityOk && lang.startsWith('en-us');
}

/** Index of the best preferred Apple voice present (Ava, Evan, Nathan order; `gender` restricts to that gender), else undefined. */
export function findPreferredAppleVoiceIndex<T extends AppleVoiceLike>(voices: readonly T[], gender?: 'female' | 'male'): number | undefined {
  for (const p of PREFERRED_APPLE_VOICES) {
    if (gender && p.gender !== gender) continue;
    const i = voices.findIndex((v) => matchesPreferredApple(v, p));
    if (i >= 0) return i;
  }
  return undefined;
}

export function hasPreferredAppleVoice(voices: readonly AppleVoiceLike[]): boolean {
  return findPreferredAppleVoiceIndex(voices) !== undefined;
}
