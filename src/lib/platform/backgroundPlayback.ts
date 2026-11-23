import { Capacitor, registerPlugin } from '@capacitor/core';
import type { VocabularyWord } from '@/types/vocabulary';
import { cleanSpeechText } from '@/utils/speech/core/speechText';

/**
 * Android only. When the screen turns off or the app goes to the background the WebView
 * is throttled, so the web player hands its queue to a native foreground service that
 * speaks with the system TextToSpeech engine. When the app comes back the service reports
 * how far it got and the web player continues from there.
 */
export interface BackgroundQueueItem {
  title: string;
  text: string;
}

export interface BackgroundStopResult {
  running: boolean;
  paused: boolean;
  advanced: number;
}

interface BackgroundPlaybackPlugin {
  start(options: { items: BackgroundQueueItem[]; rate: number; lang: string }): Promise<void>;
  stop(): Promise<BackgroundStopResult>;
  requestNotifications(): Promise<{ granted: boolean }>;
}

const plugin = registerPlugin<BackgroundPlaybackPlugin>('BackgroundPlayback');

/** How many upcoming words are handed to the service. It loops, so this only bounds the payload. */
export const MAX_BACKGROUND_ITEMS = 200;

export function isBackgroundPlaybackSupported(): boolean {
  try {
    return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('BackgroundPlayback');
  } catch {
    return false;
  }
}

/** Same text the foreground player speaks: word, meaning, example. */
export function speechTextFor(word: VocabularyWord): string {
  const text = [word.word, word.meaning, word.example]
    .filter(Boolean)
    .map((part) => String(part).trim())
    .join('. ');
  return cleanSpeechText(text) || text;
}

export function buildBackgroundQueue(
  words: readonly VocabularyWord[],
  startIndex: number,
  max = MAX_BACKGROUND_ITEMS
): BackgroundQueueItem[] {
  if (words.length === 0) return [];
  const length = words.length;
  const first = ((startIndex % length) + length) % length;
  const count = Math.min(length, max);
  const items: BackgroundQueueItem[] = [];
  for (let offset = 0; offset < count; offset += 1) {
    const word = words[(first + offset) % length];
    items.push({ title: word.word, text: speechTextFor(word) });
  }
  return items;
}

/**
 * Index to show when the app returns. The native queue may be shorter than the list, but it
 * loops over the same words, so the position is the start plus the words it moved through.
 */
export function resolveResumeIndex(startIndex: number, advanced: number, listLength: number): number {
  if (listLength <= 0) return 0;
  return (((startIndex + Math.max(0, advanced)) % listLength) + listLength) % listLength;
}

export async function startBackgroundPlayback(
  words: readonly VocabularyWord[],
  startIndex: number,
  options: { rate: number; lang: string }
): Promise<boolean> {
  const items = buildBackgroundQueue(words, startIndex);
  if (items.length === 0) return false;
  await plugin.start({ items, rate: options.rate, lang: options.lang });
  return true;
}

export async function stopBackgroundPlayback(): Promise<BackgroundStopResult> {
  return plugin.stop();
}

export async function requestBackgroundNotifications(): Promise<boolean> {
  try {
    const result = await plugin.requestNotifications();
    return result.granted;
  } catch {
    return false;
  }
}
