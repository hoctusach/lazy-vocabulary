
import { useSpeechManager } from './speech/useSpeechManager';

export const useSpeechSynthesis = () => {
  console.log("Initializing speech synthesis hook");
  return useSpeechManager();
};
