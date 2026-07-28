import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { PracticeEvaluationResult } from '../types';

interface ResultPopupProps {
  result: PracticeEvaluationResult | null;
  isOpen: boolean;
  onClose: () => void;
}

const ResultPopup: React.FC<ResultPopupProps> = ({ result, isOpen, onClose }) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-w-lg rounded-3xl">
      <DialogHeader>
        <DialogTitle>Practice result</DialogTitle>
      </DialogHeader>
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl bg-purple-50 p-4 dark:bg-purple-950/40">
            <span className="font-semibold text-slate-900 dark:text-white">Score</span>
            <span className="text-4xl font-black text-purple-600 dark:text-purple-300">{result.score}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-purple-500" style={{ width: `${result.score}%` }} />
          </div>
          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {result.feedback.map((item) => <li key={item}>• {item}</li>)}
          </ul>
          <div className="grid gap-2 sm:grid-cols-2">
            {result.allRules.map((rule) => (
              <div key={rule.id} className={`rounded-xl px-3 py-2 text-xs ${rule.passed ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200'}`}>
                {rule.passed ? '✓' : '×'} {rule.label}
              </div>
            ))}
          </div>
          <Button type="button" className="w-full rounded-2xl" onClick={onClose}>Close</Button>
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export default ResultPopup;
