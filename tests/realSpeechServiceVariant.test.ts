import { describe, it, expect, beforeEach } from 'vitest';
import { realSpeechService } from '../src/services/speech/realSpeechService';

interface MockUtterance {
  text: string;
  voice: any;
  rate: number;
  pitch: number;
  volume: number;
  onstart?: () => void;
  onend?: () => void;
  onerror?: (e: any) => void;
}

let spokenUtterances: MockUtterance[];
let voices: SpeechSynthesisVoice[];

class Utterance implements MockUtterance {
  text: string;
  voice: any = null;
  rate = 1;
  pitch = 1;
  volume = 1;
  onstart?: () => void;
  onend?: () => void;
  onerror?: (e: any) => void;
  constructor(text: string) {
    this.text = text;
  }
}

beforeEach(() => {
  spokenUtterances = [];
  voices = [
    { name: 'en-AU-Standard-A', lang: 'en-AU' } as SpeechSynthesisVoice,
    { name: 'Generic', lang: 'en-US' } as SpeechSynthesisVoice
  ];

  (global as any).SpeechSynthesisUtterance = Utterance;
  (global as any).window = {
    speechSynthesis: {
      speak: (u: Utterance) => {
        spokenUtterances.push(u);
        u.onstart && u.onstart();
        u.onend && u.onend();
      },
      cancel: () => {},
      pause: () => {},
      resume: () => {},
      getVoices: () => voices,
      addEventListener: () => {},
      speaking: false
    }
  };
});

describe('realSpeechService voice variant', () => {
  it('uses specified variant when provided', async () => {
    const success = await realSpeechService.speak('hello', {
      voiceRegion: 'AU',
      voiceVariant: 'en-AU-Standard-A'
    });

    expect(success).toBe(true);
    expect(spokenUtterances[0].voice?.name).toBe('en-AU-Standard-A');
  });
});
