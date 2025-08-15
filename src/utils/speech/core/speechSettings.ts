
import { BUTTON_STATES_KEY, SPEECH_RATE_KEY } from '@/utils/storageKeys';
import { DEFAULT_SPEECH_RATE } from '@/services/speech/core/constants';

export const getVoiceRegionFromStorage = (): 'US' | 'UK' | 'AU' => {
  try {
    const storedStates = localStorage.getItem(BUTTON_STATES_KEY);
      if (storedStates) {
        const parsedStates = JSON.parse(storedStates);
        if (parsedStates.voiceRegion === 'UK' || parsedStates.voiceRegion === 'AU') {
          return parsedStates.voiceRegion;
        }
        return 'UK';
      }
  } catch (error) {
    console.error('Error reading voice region from localStorage:', error);
  }
  return 'UK'; // Default to UK if not found or error
};

export const saveVoiceRegionToStorage = (region: 'US' | 'UK' | 'AU'): void => {
  try {
    const existingStates = localStorage.getItem(BUTTON_STATES_KEY);
    let buttonStates = {};
    
    if (existingStates) {
      buttonStates = JSON.parse(existingStates);
    }
    
    const updatedStates = {
      ...buttonStates,
      voiceRegion: region
    };
    
    localStorage.setItem(BUTTON_STATES_KEY, JSON.stringify(updatedStates));
    console.log(`Voice region saved to storage: ${region}`);
  } catch (error) {
    console.error('Error saving voice region to localStorage:', error);
  }
};


export const getStoredSpeechRate = (): number => {
  try {
    const stored = localStorage.getItem(SPEECH_RATE_KEY);
    const parsed = stored ? parseFloat(stored) : NaN;
    if (!isNaN(parsed)) return parsed;
  } catch (error) {
    console.error('Error reading speech rate from localStorage:', error);
  }
  return DEFAULT_SPEECH_RATE;
};

export const saveSpeechRateToStorage = (rate: number): void => {
  try {
    localStorage.setItem(SPEECH_RATE_KEY, rate.toString());
    console.log(`Speech rate saved: ${rate}`);
  } catch (error) {
    console.error('Error saving speech rate to localStorage:', error);
  }
};

export const getSpeechRate = (): number => {
  const rate = getStoredSpeechRate();
  console.log('[Speech Rate]', rate);
  return rate;
};

export const getSpeechPitch = (): number => {
  return 1.0; // Normal pitch
};

export const getSpeechVolume = (): number => {
  return 1.0; // Full volume
};
