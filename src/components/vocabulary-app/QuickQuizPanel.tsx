import React, { useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { Check, Sparkles, X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { VocabularyWord } from "@/types/vocabulary";
import { buildQuiz, pickWordOfTheDay } from "@/features/quiz/quizEngine";
import type { QuizQuestion } from "@/features/quiz/types";
import { markQuizCompletedToday } from "@/features/quiz/quizService";
import { loadAllWords } from "@/utils/allWords";

interface QuickQuizPanelProps {
  /** Today's due/new words, biased toward reinforcing spaced repetition. */
  targetWords?: VocabularyWord[];
  className?: string;
}

const QUESTION_COUNT = 5;

const QuickQuizPanel: React.FC<QuickQuizPanelProps> = ({ targetWords, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const pool = useMemo(() => loadAllWords() ?? [], []);
  const wordOfTheDay = useMemo(() => pickWordOfTheDay(pool), [pool]);

  const startQuiz = (seedWord?: VocabularyWord) => {
    const targets = targetWords && targetWords.length > 0 ? targetWords : pool;
    const seeded = seedWord ? [seedWord, ...targets.filter((w) => w.word !== seedWord.word)] : targets;
    const built = buildQuiz(seeded, pool, QUESTION_COUNT);

    setQuestions(built);
    setQuestionIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setIsFinished(built.length === 0);
    setIsOpen(true);
  };

  const currentQuestion = questions[questionIndex];

  const handleSelect = (option: string) => {
    if (selected) return;
    setSelected(option);
    if (option === currentQuestion.correctMeaning) {
      setCorrectCount((count) => count + 1);
    }
  };

  const handleNext = () => {
    const nextIndex = questionIndex + 1;
    if (nextIndex >= questions.length) {
      setIsFinished(true);
      markQuizCompletedToday();
      const scoreRatio = questions.length > 0 ? correctCount / questions.length : 0;
      if (scoreRatio >= 0.6) {
        confetti({ particleCount: 60, spread: 65, origin: { y: 0.6 } });
      }
      return;
    }
    setQuestionIndex(nextIndex);
    setSelected(null);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <Card className={cn("mt-3 w-full border-2 theme-card-surface theme-border", className)}>
        <CardContent className="flex items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--lv-accent-soft)", color: "var(--lv-accent)" }}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold" style={{ color: "var(--lv-heading)" }}>
                {wordOfTheDay ? `Word of the day: ${wordOfTheDay.word}` : "60-second quiz"}
              </div>
              <div className="text-xs theme-muted-text truncate">
                {wordOfTheDay?.meaning ?? "Test yourself on a few words"}
              </div>
            </div>
          </div>
          <Button size="sm" className="shrink-0" onClick={() => startQuiz(wordOfTheDay ?? undefined)}>
            Quiz me
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isFinished ? "Nice work!" : `Question ${questionIndex + 1} of ${questions.length}`}
            </DialogTitle>
          </DialogHeader>

          {questions.length === 0 && (
            <p className="text-sm theme-muted-text">
              Not enough words to build a quiz yet — learn a few more first.
            </p>
          )}

          {!isFinished && currentQuestion && (
            <div className="space-y-4">
              <div>
                <p className="text-xl font-bold" style={{ color: "var(--lv-word-title)" }}>
                  {currentQuestion.word}
                </p>
                {currentQuestion.example && (
                  <p className="mt-1 text-sm italic theme-muted-text">{currentQuestion.example}</p>
                )}
              </div>

              <div className="space-y-2">
                {currentQuestion.options.map((option) => {
                  const isCorrect = option === currentQuestion.correctMeaning;
                  const isSelected = option === selected;
                  const showResult = selected !== null;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSelect(option)}
                      disabled={showResult}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        "theme-border",
                        !showResult && "hover:bg-[var(--lv-card-highlight)]",
                        showResult && isCorrect && "border-green-500 bg-green-50 dark:bg-green-900/30",
                        showResult && isSelected && !isCorrect && "border-red-500 bg-red-50 dark:bg-red-900/30",
                      )}
                    >
                      <span>{option}</span>
                      {showResult && isCorrect && <Check className="h-4 w-4 shrink-0 text-green-600" />}
                      {showResult && isSelected && !isCorrect && <X className="h-4 w-4 shrink-0 text-red-600" />}
                    </button>
                  );
                })}
              </div>

              <Button className="w-full" onClick={handleNext} disabled={selected === null}>
                {questionIndex + 1 >= questions.length ? "See results" : "Next"}
              </Button>
            </div>
          )}

          {isFinished && questions.length > 0 && (
            <div className="space-y-4 text-center">
              <p className="text-3xl font-bold" style={{ color: "var(--lv-accent)" }}>
                {correctCount} / {questions.length}
              </p>
              <p className="text-sm theme-muted-text">
                {correctCount === questions.length
                  ? "Perfect score!"
                  : "Keep practicing — try again tomorrow."}
              </p>
              <Button className="w-full" onClick={handleClose}>
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickQuizPanel;
