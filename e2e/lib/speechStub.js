// Injected with evaluateOnNewDocument. Installs a controllable speechSynthesis.
// window.__speech = { calls, cancels, utterances, fireEnd(), auto }
(() => {
  const voices = [
    { name: 'Stub US', lang: 'en-US', voiceURI: 'stub-us', localService: true, default: true },
    { name: 'Stub GB', lang: 'en-GB', voiceURI: 'stub-gb', localService: true, default: false },
    { name: 'Stub AU', lang: 'en-AU', voiceURI: 'stub-au', localService: true, default: false },
  ];
  const log = { overlap: 0, calls: [], cancels: 0, pauses: 0, resumes: 0, current: null, throwOnSpeak: false };
  class U {
    constructor(text) {
      this.text = text; this.rate = 1; this.pitch = 1; this.volume = 1; this.lang = 'en-US'; this.voice = null;
      this.onend = null; this.onerror = null; this.onstart = null; this.onboundary = null;
    }
    addEventListener(t, fn) { this['on' + t] = fn; }
    removeEventListener() {}
  }
  const synth = {
    speaking: false, paused: false, pending: false,
    getVoices: () => voices,
    speak(u) {
      if (log.throwOnSpeak) throw new Error('stub speak failure');
      if (log.current) log.overlap++;
      log.calls.push({ text: u.text, rate: u.rate, volume: u.volume, voice: u.voice && u.voice.name, t: Date.now() });
      log.current = u; synth.speaking = true;
      setTimeout(() => { try { u.onstart && u.onstart({}); } catch (e) {} }, 0);
      if (log.auto) setTimeout(() => log.fireEnd(), log.auto);
    },
    cancel() { log.cancels++; const u = log.current; log.current = null; synth.speaking = false;
      if (u && u.onerror) { try { u.onerror({ error: 'canceled' }); } catch (e) {} } },
    pause() { log.pauses++; synth.paused = true; },
    resume() { log.resumes++; synth.paused = false; },
    addEventListener() {}, removeEventListener() {},
    onvoiceschanged: null,
  };
  log.fireEnd = () => { const u = log.current; if (!u) return false; log.current = null; synth.speaking = false;
    try { u.onend && u.onend({}); } catch (e) {} return true; };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = U;
  window.__speech = log;
})();
