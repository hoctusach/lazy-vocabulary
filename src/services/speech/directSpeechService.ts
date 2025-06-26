
import { realSpeechService } from './realSpeechService';

interface SpeechOptions {
  voiceRegion: 'US' | 'UK' | 'AU';
  onEnd?: () => void;
  onError?: (error: SpeechSynthesisErrorEvent) => void;
  muted?: boolean;
  paused?: boolean;
  userInteracted?: boolean;
}

class DirectSpeechService {
  async speak(text: string, options: SpeechOptions): Promise<boolean> {
    return realSpeechService.speak(text, options);
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
