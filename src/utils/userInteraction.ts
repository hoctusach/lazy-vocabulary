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
  const enable = () => {
    markUserInteraction();
    preloadSpeech();
    document.removeEventListener('click', enable);
    document.removeEventListener('keydown', enable);
    document.removeEventListener('touchstart', enable);
  };

  document.addEventListener('click', enable);
  document.addEventListener('keydown', enable);
  document.addEventListener('touchstart', enable);
};

export const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
export const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

const preloadSpeech = () => {
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0.01;
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn('Speech preload failed:', e);
  }
};
