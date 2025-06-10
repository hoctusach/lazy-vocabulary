
export const getVoiceRegionFromStorage = (): 'US' | 'UK' => {
  try {
    const storedStates = localStorage.getItem('buttonStates');
    if (storedStates) {
      const parsedStates = JSON.parse(storedStates);
      return parsedStates.voiceRegion === 'UK' ? 'UK' : 'US';
    }
  } catch (error) {
    console.error('Error reading voice region from localStorage:', error);
  }
  return 'US'; // Default to US if not found or error
};

export const getSpeechRate = (): number => {
  const region = getVoiceRegionFromStorage();
  return region === 'US' ? 0.8 : 1.0;
};

export const getSpeechPitch = (): number => {
  return 1.0; // Normal pitch
};

export const getSpeechVolume = (): number => {
  return 1.0; // Full volume
};
