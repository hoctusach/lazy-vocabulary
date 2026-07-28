import React from 'react';
import { Mic, MicOff, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VocabularyWord } from '@/types/vocabulary';
import { buildPracticeMetadata, defaultPracticeRules } from '@/features/practice/metadata';
import { evaluatePracticeSentence } from '@/features/practice/ruleEngine';
import { savePracticeAttempt } from '@/features/practice/storage';
import type { PracticeEvaluationResult } from '@/features/practice/types';

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

interface PracticeDialogProps {
  word: VocabularyWord | null;
  isOpen: boolean;
  onClose: () => void;
}

const getSpeechRecognition = (): { new (): SpeechRecognitionLike } | null => {
  if (typeof window === 'undefined') return null;
  return (window as typeof window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition
    ?? (window as typeof window & { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition
    ?? null;
};

const PracticeDialog: React.FC<PracticeDialogProps> = ({ word, isOpen, onClose }) => {
  const [transcript, setTranscript] = React.useState('');
  const [isRecording, setIsRecording] = React.useState(false);
  const [result, setResult] = React.useState<PracticeEvaluationResult | null>(null);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const speechSupported = Boolean(getSpeechRecognition());

  React.useEffect(() => {
    if (!isOpen) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      setTranscript('');
      setResult(null);
    }
  }, [isOpen]);

  if (!isOpen || !word) return null;

  const metadata = buildPracticeMetadata(word);

  const startRecording = () => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const nextTranscript = Array.from(event.results)
        .map((item) => item[0].transcript)
        .join(' ')
        .trim();
      setTranscript(nextTranscript);
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    setIsRecording(true);
    recognition.start();
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const submitPractice = () => {
    const evaluation = evaluatePracticeSentence(transcript, metadata, defaultPracticeRules);
    setResult(evaluation);
    savePracticeAttempt({
      id: `${Date.now()}-${word.word}`,
      word: {
        word: word.word,
        meaning: word.meaning,
        example: word.example,
        category: word.category,
      },
      transcript,
      result: evaluation,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-3 py-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="practice-title">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-300">Practice</p>
            <h2 id="practice-title" className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Use “{word.word}”</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Create one original sentence. You can speak first, then edit before submitting.</p>
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

        {result && (
          <div className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900 dark:text-white">Score</p>
              <p className="text-3xl font-black text-purple-600 dark:text-purple-300">{result.score}</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-purple-500" style={{ width: `${result.score}%` }} />
            </div>
            <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {result.feedback.map((item) => <li key={item}>• {item}</li>)}
            </ul>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {result.allRules.map((rule) => (
                <div key={rule.id} className={`rounded-xl px-3 py-2 text-xs ${rule.passed ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200'}`}>
                  {rule.passed ? '✓' : '×'} {rule.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PracticeDialog;
