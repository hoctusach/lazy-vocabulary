import React from 'react';
import { Mic, MicOff, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VocabularyWord } from '@/types/vocabulary';
import { buildPracticeMetadata } from '@/features/practice/metadata';
import type { PracticeEvaluationResult } from '@/features/practice/types';
import { browserSpeechRecognitionApi, type RecordingSession, type SpeechRecognitionApi } from '@/features/practice/api/speechRecognition';
import { evaluateAndSavePractice } from '@/features/practice/services/practiceService';
import ResultPopup from '@/features/practice/components/ResultPopup';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

interface PracticeDialogProps {
  word: VocabularyWord | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  speechApi?: SpeechRecognitionApi;
}

const PracticeDialog: React.FC<PracticeDialogProps> = ({
  word,
  isOpen,
  onClose,
  onSaved,
  speechApi = browserSpeechRecognitionApi,
}) => {
  const [transcript, setTranscript] = React.useState('');
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingError, setRecordingError] = React.useState('');
  const [result, setResult] = React.useState<PracticeEvaluationResult | null>(null);
  const [isResultOpen, setIsResultOpen] = React.useState(false);
  const sessionRef = React.useRef<RecordingSession | null>(null);
  const speechSupported = speechApi.isSupported();

  React.useEffect(() => {
    if (isOpen) {
      // Stop any ongoing vocabulary playback so recording is not disturbed
      unifiedSpeechController.stop();
      return;
    }
    sessionRef.current?.stop();
    sessionRef.current = null;
    setIsRecording(false);
    setTranscript('');
    setResult(null);
    setRecordingError('');
    setIsResultOpen(false);
  }, [isOpen]);

  if (!isOpen || !word) return null;

  const metadata = buildPracticeMetadata(word);

  const startRecording = () => {
    setRecordingError('');
    const session = speechApi.start({
      onTranscript: setTranscript,
      onEnd: () => setIsRecording(false),
      onError: (message) => {
        setRecordingError(message);
        setIsRecording(false);
      },
    });
    if (!session) return;
    sessionRef.current = session;
    setIsRecording(true);
  };

  const stopRecording = () => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setIsRecording(false);
  };

  const submitPractice = () => {
    const attempt = evaluateAndSavePractice({ word, transcript });
    setResult(attempt.result);
    setIsResultOpen(true);
    onSaved?.();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-3 py-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="practice-title">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-300">Practice</p>
              <h2 id="practice-title" className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Use “{word.word}”</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Create one original sentence. Speak first, then edit the transcript before submitting.</p>
            </div>
            <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full p-0" onClick={onClose} aria-label="Close practice">
              <X size={18} />
            </Button>
          </div>

          <div className="mt-4 rounded-2xl bg-purple-50 p-3 text-sm text-purple-950 dark:bg-purple-950/40 dark:text-purple-100">
            <span className="font-semibold">Meaning:</span> {word.meaning}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={isRecording ? stopRecording : startRecording} disabled={!speechSupported} className="rounded-full bg-purple-600 text-white hover:bg-purple-700">
              {isRecording ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {isRecording ? 'Stop recording' : 'Start recording'}
            </Button>
            {!speechSupported && <span className="self-center text-xs text-amber-600">Speech recognition is unavailable. Type your sentence instead.</span>}
          </div>
          {recordingError && <p className="mt-2 text-xs text-rose-600">{recordingError}</p>}

          <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="practice-transcript">Transcript</label>
          <textarea
            id="practice-transcript"
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder={`Example: I try to use ${metadata.lemma} in my daily English practice.`}
            className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 bg-white p-3 text-base text-slate-950 outline-none ring-purple-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />

          <Button type="button" onClick={submitPractice} disabled={transcript.trim().length === 0} className="mt-3 w-full rounded-2xl bg-slate-950 py-6 text-base text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">
            <Sparkles className="mr-2 h-4 w-4" /> Submit practice
          </Button>
        </div>
      </div>
      <ResultPopup result={result} isOpen={isResultOpen} onClose={() => setIsResultOpen(false)} />
    </>
  );
};

export default PracticeDialog;
