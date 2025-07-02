export const logAvailableVoices = (voices: SpeechSynthesisVoice[]) => {
  if (!voices || voices.length === 0) {
    console.warn("[Speech] No voices available from browser/device.");
    return;
  }

  console.log("[Speech] Available voices from device/browser:");
  voices.forEach(v => {
    console.log(`[Voice] name: ${v.name}, lang: ${v.lang}, local: ${v.localService}, default: ${v.default}`);
  });
};
