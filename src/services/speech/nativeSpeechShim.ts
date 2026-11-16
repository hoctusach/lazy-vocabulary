import { buildSpeakOptions, loadNativeTts, pickVoiceIndex, shouldUseNativeTts, type NativeVoice } from './nativeTts';

/**
 * Provides `window.speechSynthesis` / `SpeechSynthesisUtterance` backed by the
 * native TTS plugin, so the existing speech pipeline (which speaks through the
 * Web Speech API) works unchanged in the Capacitor app. Installed only when
 * running natively or when Web Speech is absent; plain browsers keep the real API.
 */

class ShimVoice {
  default: boolean;
  constructor(
    public voiceURI: string,
    public name: string,
    public lang: string,
    public localService: boolean,
    isDefault: boolean,
    public index: number,
  ) {
    this.default = isDefault;
  }
}

class ShimUtterance extends EventTarget {
  text: string;
  lang = '';
  voice: ShimVoice | null = null;
  rate = 1;
  pitch = 1;
  volume = 1;
  onstart: ((e: Event) => void) | null = null;
  onend: ((e: Event) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onpause: ((e: Event) => void) | null = null;
  onresume: ((e: Event) => void) | null = null;
  onboundary: ((e: Event) => void) | null = null;
  onmark: ((e: Event) => void) | null = null;
  constructor(text = '') {
    super();
    this.text = String(text);
  }
  emit(type: string, extra: Record<string, unknown> = {}) {
    const e = new Event(type);
    Object.assign(e, { utterance: this, charIndex: 0, elapsedTime: 0, name: '' }, extra);
    const handler = (this as unknown as Record<string, unknown>)['on' + type];
    if (typeof handler === 'function') {
      try { (handler as (e: Event) => void).call(this, e); } catch (err) { console.warn('[nativeTts] handler', err); }
    }
    this.dispatchEvent(e);
  }
}

export const FAILED_SPEAK_DELAY_MS = 300;

class ShimSynth extends EventTarget {
  speaking = false;
  pending = false;
  paused = false;
  onvoiceschanged: ((e: Event) => void) | null = null;
  private voices: ShimVoice[] = [];
  private raw: NativeVoice[] = [];
  private queue: ShimUtterance[] = [];
  private current: ShimUtterance | null = null;
  private token = 0;
  private loading = false;

  constructor() {
    super();
    void this.loadVoices(3);
  }

  private async loadVoices(retries: number): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    try {
      const h = await loadNativeTts();
      const res = h ? await h.tts.getSupportedVoices() : null;
      const list = (res?.voices ?? []) as NativeVoice[];
      if (list.length) {
        this.raw = list;
        this.voices = list.map((v, i) => new ShimVoice(v.voiceURI || v.name, v.name, v.lang, v.localService, v.default, i));
        this.fireVoicesChanged();
      } else if (retries > 0) {
        setTimeout(() => { this.loading = false; void this.loadVoices(retries - 1); }, 1000);
        return;
      }
    } catch {
      /* no native voices available */
    }
    this.loading = false;
  }

  private fireVoicesChanged() {
    const e = new Event('voiceschanged');
    if (typeof this.onvoiceschanged === 'function') this.onvoiceschanged(e);
    this.dispatchEvent(e);
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.voices as unknown as SpeechSynthesisVoice[];
  }

  speak(u: SpeechSynthesisUtterance): void {
    this.queue.push(u as unknown as ShimUtterance);
    this.pending = true;
    if (!this.current && !this.paused) void this.next();
  }

  private async next(): Promise<void> {
    const u = this.queue.shift();
    this.pending = this.queue.length > 0;
    if (!u) return;
    this.current = u;
    this.speaking = true;
    const my = ++this.token;
    u.emit('start');
    let errorType: string | null = null;
    try {
      const h = await loadNativeTts();
      if (!h) throw new Error('not-supported');
      const voiceIdx = pickVoiceIndex(this.raw, u.lang, u.voice?.name);
      await h.tts.speak(buildSpeakOptions(u, u.voice ? u.voice.index : voiceIdx));
    } catch (err) {
      errorType = String((err as Error)?.message) === 'not-supported' ? 'synthesis-unavailable' : 'synthesis-failed';
    }
    // A failing engine rejects within microtasks. Settle on a real timer so a caller that
    // re-speaks from onerror cannot starve the event loop (page freeze, REG-02/EDGE-10).
    if (errorType) await new Promise((r) => setTimeout(r, FAILED_SPEAK_DELAY_MS));
    // cancel()/pause() already settled state and events for a superseded utterance
    if (my !== this.token) return;
    this.current = null;
    this.speaking = false;
    if (errorType) u.emit('error', { error: errorType });
    else u.emit('end');
    if (!this.paused) void this.next();
  }

  cancel(): void {
    const had = this.current;
    this.queue = [];
    this.pending = false;
    this.paused = false;
    this.token++;
    this.current = null;
    this.speaking = false;
    void loadNativeTts().then((h) => h?.tts.stop()).catch(() => {});
    // Browsers fire the cancel error asynchronously; doing it synchronously let
    // onerror -> speak -> cancel recurse without yielding.
    if (had) setTimeout(() => had.emit('error', { error: 'canceled' }), 0);
  }

  pause(): void {
    // Native engine can't pause mid-utterance: stop, and replay the utterance on resume.
    if (!this.current || this.paused) return;
    this.paused = true;
    const u = this.current;
    this.queue.unshift(u);
    this.token++;
    this.current = null;
    this.speaking = false;
    void loadNativeTts().then((h) => h?.tts.stop()).catch(() => {});
    u.emit('pause');
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    const u = this.queue[0];
    u?.emit('resume');
    void this.next();
  }
}

export function installNativeSpeechShim(): boolean {
  if (typeof window === 'undefined') return false;
  const present = typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance === 'function';
  if (!shouldUseNativeTts(present)) return false;
  try {
    const synth = new ShimSynth();
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true, writable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: ShimUtterance, configurable: true, writable: true });
    Object.defineProperty(window, 'SpeechSynthesisVoice', { value: ShimVoice, configurable: true, writable: true });
    return true;
  } catch (err) {
    console.warn('[nativeTts] shim install failed', err);
    return false;
  }
}
