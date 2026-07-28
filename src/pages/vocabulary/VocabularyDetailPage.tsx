import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PracticeDialog from '@/components/practice/PracticeDialog';
import PracticeHistory from '@/features/practice/components/PracticeHistory';
import { searchVocabulary } from '@/services/search/vocabularySearch';
import type { VocabularyWord } from '@/types/vocabulary';

const findVocabularyWord = (slug?: string): VocabularyWord | null => {
  const query = decodeURIComponent(slug ?? '').trim();
  if (!query) return null;
  return searchVocabulary(query, 25).find((item) => item.word.toLowerCase() === query.toLowerCase())
    ?? searchVocabulary(query, 1)[0]
    ?? null;
};

const VocabularyDetailPage: React.FC = () => {
  const { word: wordSlug } = useParams();
  const word = React.useMemo(() => findVocabularyWord(wordSlug), [wordSlug]);
  const [isPracticeOpen, setIsPracticeOpen] = React.useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = React.useState(0);

  if (!word) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Button asChild variant="ghost" className="mb-4">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
        </Button>
        <Card>
          <CardHeader><CardTitle>Vocabulary word not found</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground">Try returning home and searching for another word.</CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-4xl space-y-4 px-4 py-8">
      <Button asChild variant="ghost">
        <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to vocabulary</Link>
      </Button>

      <Card className="overflow-hidden">
        <CardHeader className="bg-purple-50 dark:bg-purple-950/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-300">Vocabulary Detail</p>
              <CardTitle className="mt-2 text-4xl">{word.word}</CardTitle>
              {word.category && <p className="mt-1 text-sm text-muted-foreground">{word.category}</p>}
            </div>
            <Button onClick={() => setIsPracticeOpen(true)} className="rounded-full bg-purple-600 text-white hover:bg-purple-700">
              <Dumbbell className="mr-2 h-4 w-4" /> Practice
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-5">
          <section>
            <h2 className="font-semibold">Meaning</h2>
            <p className="mt-1 whitespace-pre-line text-slate-700 dark:text-slate-200">{word.meaning}</p>
          </section>
          <section>
            <h2 className="font-semibold">Example</h2>
            <p className="mt-1 whitespace-pre-line italic text-slate-700 dark:text-slate-200">{word.example}</p>
          </section>
          {word.translation && (
            <section>
              <h2 className="font-semibold">Translation</h2>
              <p className="mt-1 whitespace-pre-line text-slate-700 dark:text-slate-200">{word.translation}</p>
            </section>
          )}
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Practice history</h2>
        <PracticeHistory word={word.word} refreshKey={historyRefreshKey} />
      </section>

      <PracticeDialog
        word={word}
        isOpen={isPracticeOpen}
        onClose={() => setIsPracticeOpen(false)}
        onSaved={() => setHistoryRefreshKey((key) => key + 1)}
      />
    </main>
  );
};

export default VocabularyDetailPage;
