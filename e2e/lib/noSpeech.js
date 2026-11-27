// "Speech deleted" profile.
(() => {
  try { delete window.speechSynthesis; } catch (e) {}
  try { Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); } catch (e) {}
  try { delete window.SpeechSynthesisUtterance; } catch (e) {}
  try { Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: undefined, configurable: true }); } catch (e) {}
})();
