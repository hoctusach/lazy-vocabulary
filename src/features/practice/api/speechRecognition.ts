export type SpeechRecognitionResultEventLike = {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};

export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export interface RecordingSession {
  stop: () => void;
}

export interface SpeechRecognitionApi {
  isSupported: () => boolean;
  start: (handlers: {
    onTranscript: (transcript: string) => void;
    onEnd: () => void;
    onError: (message: string) => void;
  }) => RecordingSession | null;
}

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
};

export const browserSpeechRecognitionApi: SpeechRecognitionApi = {
  isSupported: () => Boolean(getSpeechRecognitionConstructor()),
  start: ({ onTranscript, onEnd, onError }) => {
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) return null;

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((item) => item[0].transcript)
        .join(' ')
        .trim();
      onTranscript(transcript);
    };
    recognition.onerror = (event) => onError(event.error ?? 'Speech recognition failed.');
    recognition.onend = onEnd;
    recognition.start();

    return { stop: () => recognition.stop() };
  },
};
