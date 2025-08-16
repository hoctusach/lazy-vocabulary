let userInteracted = false;

export const loadUserInteractionState = () => {
  try {
    userInteracted = localStorage.getItem('speechUnlocked') === 'true';
  } catch { /* ignore */ }
  return userInteracted;
};

export const markUserInteraction = () => {
  userInteracted = true;
  try {
    localStorage.setItem('speechUnlocked', 'true');
  } catch { /* ignore */ }
};

export const resetUserInteraction = () => {
  userInteracted = false;
  try {
    localStorage.setItem('speechUnlocked', 'false');
  } catch { /* ignore */ }
};

export const hasUserInteracted = () => userInteracted;

export const setupUserInteractionListeners = () => {
  const enableAudio = () => {
    if (userInteracted) return;
    markUserInteraction();
    try {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      const silent = new SpeechSynthesisUtterance(' ');
      silent.volume = 0.01;
      speechSynthesis.speak(silent);
    } catch (e) {
      console.warn('Speech preload failed:', e);
    }
  };

  if (userInteracted) {
    enableAudio();
    return;
  }

  document.addEventListener('click', enableAudio, { once: true });
  document.addEventListener('keydown', enableAudio, { once: true });
  document.addEventListener('touchstart', enableAudio, { once: true });
};

export const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
export const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
