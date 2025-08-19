
import { realSpeechService } from './realSpeechService';
import { unifiedSpeechController } from './unifiedSpeechController';

interface SpeechOptions {
  voiceName?: string;
  onEnd?: () => void;
  onError?: (error: SpeechSynthesisErrorEvent) => void;
  muted?: boolean;
  paused?: boolean;
  userInteracted?: boolean;
}

class DirectSpeechService {
  async speak(text: string, options: SpeechOptions): Promise<boolean> {
    const epoch = unifiedSpeechController.currentEpoch();
    if (!unifiedSpeechController.canSpeak(epoch)) {
      return false;
    }
    return realSpeechService.speak(text, { ...options, epoch });
  }

  stop(): void {
    realSpeechService.stop();
  }

  pause(): void {
    realSpeechService.pause();
  }

  resume(): void {
    realSpeechService.resume();
  }

  isCurrentlyActive(): boolean {
    return realSpeechService.isCurrentlyActive();
  }

  getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return realSpeechService.getCurrentUtterance();
  }
}

export const directSpeechService = new DirectSpeechService();
