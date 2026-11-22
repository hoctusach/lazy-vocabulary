import React from 'react';
import { Info } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIsVietnameseDevice } from '@/utils/deviceLanguage';
import { MASTER_INTERVAL_DAYS, REVIEW_INTERVALS_DAYS } from '@/services/learningProgressService';

export const SRS_LINE_EN = 'Review right before you forget — remember it for good';
export const SRS_LINE_VI = 'Nghe lại đúng lúc sắp quên — nhớ lâu hơn';

/** Fixed principle line (FB-34). Replaces the old collapsible SRS tip. Tap opens a short explanation. */
const SrsPrincipleLine: React.FC<{ fixed?: boolean }> = ({ fixed = false }) => {
  const isVi = useIsVietnameseDevice();
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

  const line = isVi ? SRS_LINE_VI : SRS_LINE_EN;
  const days = REVIEW_INTERVALS_DAYS.join(', ');
  return (
    <>
      <div
        className={fixed ? 'fixed inset-x-0 z-30 mx-auto w-full max-w-lg px-3' : 'mt-3'}
        style={fixed ? { bottom } : undefined}
        data-testid="srs-principle-wrap"
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
            <DialogTitle>{isVi ? 'Ôn đúng lúc' : 'Review at the right time'}</DialogTitle>
            <DialogDescription>
              {isVi
                ? 'Mỗi từ được nhắc lại ngay trước khi bạn có thể quên nó, nên bạn nhớ lâu hơn.'
                : 'Each word comes back right before you would forget it, so it sticks.'}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm" data-testid="srs-principle-intervals">
            {isVi
              ? `Các lần ôn tiếp theo của một từ: sau ${days} ngày, rồi ${MASTER_INTERVAL_DAYS} ngày một lần.`
              : `Next reviews for a word: after ${days} days, then every ${MASTER_INTERVAL_DAYS} days.`}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SrsPrincipleLine;
