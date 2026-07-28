import React from 'react';
import { loadPracticeHistory } from '../storage';

interface PracticeHistoryProps {
  word?: string;
  refreshKey?: number;
}

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

const PracticeHistory: React.FC<PracticeHistoryProps> = ({ word, refreshKey = 0 }) => {
  const [attempts, setAttempts] = React.useState(() => {
    const normalizedWord = word?.trim().toLowerCase();
    return loadPracticeHistory().filter((attempt) => !normalizedWord || attempt.word.word.toLowerCase() === normalizedWord);
  });

  React.useEffect(() => {
    const normalizedWord = word?.trim().toLowerCase();
    setAttempts(loadPracticeHistory().filter((attempt) => !normalizedWord || attempt.word.word.toLowerCase() === normalizedWord));
  }, [word, refreshKey]);

  if (attempts.length === 0) {
    return <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No practice history yet.</div>;
  }

  return (
    <div className="space-y-2">
      {attempts.map((attempt) => (
        <article key={attempt.id} className="rounded-2xl border bg-background p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold">{attempt.word.word}</h4>
              <p className="text-xs text-muted-foreground">{formatDate(attempt.createdAt)}</p>
            </div>
            <div className="rounded-full bg-purple-100 px-3 py-1 text-sm font-bold text-purple-700 dark:bg-purple-950/50 dark:text-purple-200">
              {attempt.result.score}
            </div>
          </div>
          <p className="mt-2 text-sm italic text-slate-700 dark:text-slate-200">“{attempt.transcript}”</p>
        </article>
      ))}
    </div>
  );
};

export default PracticeHistory;
