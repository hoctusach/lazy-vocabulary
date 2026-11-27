import React from 'react';
import { Info } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MASTER_INTERVAL_DAYS, REVIEW_INTERVALS_DAYS } from '@/services/learningProgressService';

/** [FB-58] English only. One simple idea: hear a word again just before you forget it. */
export const SRS_LINE = 'Listen again just before you forget — it sticks longer';

/** Fixed principle line (FB-34). Replaces the old collapsible SRS tip. Tap opens a short explanation. */
const SrsPrincipleLine: React.FC<{ fixed?: boolean }> = ({ fixed = false }) => {
  const [open, setOpen] = React.useState(false);
  const [bottom, setBottom] = React.useState<string | undefined>(undefined);

  // Sit just above the bottom tab bar (and any ad slot); measured so it never overlaps.
  React.useLayoutEffect(() => {
    if (!fixed) return;
    const bar = document.querySelector('[data-bottom-tab-bar]');
    const measure = () => {
      const r = bar?.getBoundingClientRect();
      // Distance from the viewport bottom to the bar's top (robust if the bar is not flush with the viewport edge).
      const h = r ? Math.round(Number.isFinite(r.top) ? window.innerHeight - r.top : r.height) : 64;
      setBottom(`calc(${h}px + var(--ad-slot, 0px))`);
    };
    measure();
    window.addEventListener('resize', measure);
    const ro = bar && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (bar) ro?.observe(bar);
    return () => {
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, [fixed]);

  const line = SRS_LINE;
  const days = REVIEW_INTERVALS_DAYS.join(', ');
  return (
    <>
      <div
        className={fixed ? 'fixed inset-x-0 z-30 mx-auto w-full max-w-lg px-3' : 'mt-3'}
        style={fixed ? { bottom } : undefined}
        data-testid="srs-principle-wrap"
        data-srs-principle-line
      >
        <button
          type="button"
          data-testid="srs-principle"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="lv-srs-principle flex w-full items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-center text-xs font-medium leading-snug"
          style={{ background: 'var(--lv-card-bg)', borderColor: 'var(--lv-border-color)', color: 'var(--lv-accent)' }}
        >
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{line}</span>
        </button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="srs-principle-dialog">
          <DialogHeader>
            <DialogTitle>Review at the right time</DialogTitle>
            <DialogDescription>
              Each word comes back right before you would forget it, so it sticks.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm" data-testid="srs-principle-intervals">
            {`Next reviews for a word: after ${days} days, then every ${MASTER_INTERVAL_DAYS} days.`}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SrsPrincipleLine;
