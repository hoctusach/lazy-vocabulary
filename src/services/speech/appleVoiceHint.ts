import { nativePlatform } from '@/lib/platform/platformKind';
import { hasPreferredAppleVoice, type AppleVoiceLike } from './appleVoices';

/** [FB-74] One-time hint (iOS only): the recommended Apple voices are not installed. Persisted so it shows once. */
export const APPLE_VOICE_HINT_KEY = 'lv_apple_voice_hint_seen';

export function hasSeenAppleVoiceHint(): boolean {
  try { return localStorage.getItem(APPLE_VOICE_HINT_KEY) === '1'; } catch { return true; }
}

export function markAppleVoiceHintSeen(): void {
  try { localStorage.setItem(APPLE_VOICE_HINT_KEY, '1'); } catch { /* storage blocked: nothing to persist */ }
}

/** True only on iOS, with a non-empty voice list that has none of Ava (Premium) / Evan / Nathan (Enhanced), and not shown before. */
export function shouldShowAppleVoiceHint(voices: readonly AppleVoiceLike[], platform: string | null = nativePlatform()): boolean {
  if (platform !== 'ios') return false;
  if (voices.length === 0) return false; // the list has not loaded yet: do not guess
  if (hasSeenAppleVoiceHint()) return false;
  return !hasPreferredAppleVoice(voices);
}

export interface AppleVoiceHintCopy { title: string; body: string; action: string }

export function appleVoiceHintCopy(vi: boolean): AppleVoiceHintCopy {
  return vi
    ? {
        title: 'Giọng đọc tự nhiên hơn trên iPhone',
        body: 'Hãy tải “Ava (Premium)” hoặc “Evan (Enhanced)”: Cài đặt › Trợ năng › Nội dung được đọc (iOS 26: Đọc & Nói) › Giọng nói › Tiếng Anh.',
        action: 'Đã hiểu',
      }
    : {
        title: 'Better voices for your iPhone',
        body: 'Download “Ava (Premium)” or “Evan (Enhanced)”: Settings › Accessibility › Spoken Content (iOS 26: Read & Speak) › Voices › English.',
        action: 'Got it',
      };
}
