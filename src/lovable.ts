// Utilities for speech playback and API integration

interface SpeechState {
  isMuted: boolean;
  voiceRegion: 'US' | 'UK' | 'AU';
}

let speechUnlocked = false;

function unlockSpeech() {
  if (speechUnlocked) return;
  speechUnlocked = true;
  try {
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch (err) {
    console.warn('Failed to unlock speech', err);
  }
}

document.addEventListener('click', unlockSpeech, { once: true });
document.addEventListener('touchstart', unlockSpeech, { once: true });

export function executeSpeech(
  text: string,
  state: SpeechState,
  scheduleNextWord: () => void
) {
  if (!text || state.isMuted || !speechUnlocked) return;

  const speakNow = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = state.voiceRegion === 'UK' ? 'en-GB' : 'en-US';
    utterance.onend = () => scheduleNextWord();
    utterance.onerror = (e) => console.error('Speech error:', e);
    window.speechSynthesis.speak(utterance);
  };

  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
    setTimeout(speakNow, 50);
  } else {
    speakNow();
  }
}

export async function fetchLatestMessage(projectId: string) {
  try {
    const res = await fetch(
      `https://lovable-api.com/projects/${projectId}/latest-message`,
      {
        headers: { Accept: 'application/json' },
        mode: 'cors'
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to load latest message:', err);
    return null;
  }
}
