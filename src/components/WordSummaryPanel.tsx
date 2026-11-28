import React from 'react';
import { ChevronDown, Eye, ListChecks } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { firstReviewDateKey } from '@/lib/progress/reviewSchedule';

/** [FB-58] Word Summary: same data as before (NEW TODAY / DUE TODAY / LEARNED today), a new section look. */
export interface SummaryWord {
  word: string;
  reviewCount?: number;
  nextReviewAt?: string;
  learnedDate?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error?: string | null;
  newList: SummaryWord[];
  dueList: SummaryWord[];
  learnedList: SummaryWord[];
  onView: (word: string) => void;
}

const formatCount = (count?: number) =>
  typeof count !== 'number' || !Number.isFinite(count) ? '—' : `${Math.max(0, Math.trunc(count))}`;

const formatDate = (value?: string) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) return '—';
  if (trimmed.length >= 10) return trimmed.slice(0, 10);
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? trimmed : new Date(parsed).toISOString().slice(0, 10);
};

/** [FB-70] A NEW TODAY word is being learned today, so its Next is the first SRS interval from today (display only, no schedule row is created). */
const newWordNext = (value?: string) => (value ? formatDate(value) : firstReviewDateKey());

const Lane: React.FC<{
  lane: 'new' | 'due' | 'learned';
  title: string;
  empty: string;
  items: SummaryWord[];
  meta: (w: SummaryWord) => string;
  viewLabel: (w: SummaryWord) => string;
  onView: (word: string) => void;
}> = ({ lane, title, empty, items, meta, viewLabel, onView }) => (
  <div className="lv-lane" data-lane={lane} data-testid={`summary-lane-${lane}`}>
    <h4 className="lv-lane-title">{title}</h4>
    <div className="lv-lane-list">
      {items.length > 0 ? (
        items.map((w, i) => (
          <div key={`${w.word}-${i}`} className="lv-row">
            <div className="min-w-0">
              <div className="lv-row-word">{w.word}</div>
              <div className="lv-row-meta">{meta(w)}</div>
            </div>
            <button type="button" aria-label={viewLabel(w)} onClick={() => onView(w.word)}>
              <Eye className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))
      ) : (
        <div className="lv-row-empty">{empty}</div>
      )}
    </div>
  </div>
);

const WordSummaryPanel: React.FC<Props> = ({ open, onOpenChange, error, newList, dueList, learnedList, onView }) => {
  const total = newList.length + dueList.length + learnedList.length;
  const pct = (n: number) => (total > 0 ? `${(n / total) * 100}%` : '0%');
  return (
    <div className="mt-3" data-testid="word-summary-section">
      <Collapsible open={open} onOpenChange={onOpenChange} className="lv-section">
        <CollapsibleTrigger className="lv-section-head" data-state={open ? 'open' : 'closed'}>
          <span className="lv-section-icon"><ListChecks className="h-4 w-4" aria-hidden="true" /></span>
          <h3 className="lv-section-title flex-1">Word Summary</h3>
          <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="lv-section-body space-y-3">
            {error && newList.length === 0 ? (
              <div className="rounded-md border p-3 text-sm" style={{ borderColor: 'var(--lv-warning)', color: 'var(--lv-text-primary)' }}>
                {error}
              </div>
            ) : (
              <>
                {total === 0 && (
                  <div className="lv-section-hint italic">No daily selection available yet.</div>
                )}
                {total > 0 && (
                  <div className="lv-day-meter" aria-hidden="true" data-testid="summary-day-meter">
                    <span style={{ width: pct(newList.length), background: 'var(--lv-success)' }} />
                    <span style={{ width: pct(dueList.length), background: 'var(--lv-error)' }} />
                    <span style={{ width: pct(learnedList.length), background: 'var(--lv-accent)' }} />
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-3">
                  <Lane
                    lane="new"
                    title={`NEW TODAY (${newList.length})`}
                    empty="No new words assigned today"
                    items={newList}
                    meta={(w) => `Review #${formatCount(w.reviewCount)} · Next: ${newWordNext(w.nextReviewAt)}`}
                    viewLabel={(w) => `View ${w.word}`}
                    onView={onView}
                  />
                  <Lane
                    lane="due"
                    title={`DUE TODAY (${dueList.length})`}
                    empty="No due reviews today"
                    items={dueList}
                    meta={(w) => `Review #${formatCount(w.reviewCount)} · Next: ${formatDate(w.nextReviewAt)}`}
                    viewLabel={(w) => `View ${w.word}`}
                    onView={onView}
                  />
                  <Lane
                    lane="learned"
                    title={`LEARNED (${learnedList.length}) today`}
                    empty="No learned words today"
                    items={learnedList}
                    meta={(w) => `Learned ${formatDate(w.learnedDate)}`}
                    viewLabel={() => 'View Word'}
                    onView={onView}
                  />
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default WordSummaryPanel;
