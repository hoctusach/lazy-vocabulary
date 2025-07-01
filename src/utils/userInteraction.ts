let userInteracted = false;

export const markUserInteraction = () => {
  userInteracted = true;
  try {
    localStorage.setItem('hadUserInteraction', 'true');
  } catch {}
};

export const resetUserInteraction = () => {
  userInteracted = false;
  try {
    localStorage.setItem('hadUserInteraction', 'false');
  } catch {}
};

export const hasUserInteracted = () => userInteracted;

export const setupUserInteractionListeners = () => {
  const enableAudio = () => {
    markUserInteraction();
    try {
      speechSynthesis.cancel();
      const silent = new SpeechSynthesisUtterance(' ');
      silent.volume = 0.01;
      speechSynthesis.speak(silent);
    } catch (e) {
      console.warn('Speech preload failed:', e);
    }
    document.removeEventListener('click', enableAudio);
    document.removeEventListener('keydown', enableAudio);
    document.removeEventListener('touchstart', enableAudio);
  };

  document.addEventListener('click', enableAudio);
  document.addEventListener('keydown', enableAudio);
  document.addEventListener('touchstart', enableAudio);
};

export const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
export const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
