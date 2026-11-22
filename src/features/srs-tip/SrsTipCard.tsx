import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useIsVietnameseDevice } from '@/utils/deviceLanguage';
import { buildSrsTip, dismissForToday, isDismissedToday, isIntroFirstDay } from './srsTip';

interface SrsTipCardProps {
  total: number;
  due: number;
}

const SrsTipCard: React.FC<SrsTipCardProps> = ({ total, due }) => {
  const isVi = useIsVietnameseDevice();
  const [hidden, setHidden] = useState<boolean>(() => isDismissedToday());
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const tip = buildSrsTip({ isVietnamese: isVi, total, due });
  const hasMore = tip.kind === 'intro' && Boolean(tip.body || tip.line);
  // First day: start expanded. Every later day: collapsed to title + "Why?".
  const firstDay = useMemo(() => (hasMore ? isIntroFirstDay() : false), [hasMore]);
  if (hidden) return null;
  const expanded = hasMore && (userExpanded ?? firstDay);

  return (
    <section
      data-testid="srs-tip"
      data-kind={tip.kind}
      className="relative mb-2 rounded-lg border border-[var(--lv-border)] bg-[var(--lv-card-bg)] py-1.5 pl-3 pr-8 text-xs leading-snug text-[var(--lv-text-secondary)]"
    >
      <p className="font-semibold text-[var(--lv-accent)]">{tip.title}</p>
      {hasMore && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setUserExpanded(!expanded)}
          className="mr-1 mt-0.5 inline-block rounded-full border border-[var(--lv-border)] px-2 py-0.5 text-[11px] font-medium text-[var(--lv-accent)] hover:bg-[var(--lv-card-highlight)]"
        >
          {isVi ? 'Vì sao?' : 'Why?'}
        </button>
      )}
      {expanded && tip.body && <p data-testid="srs-tip-body">{tip.body}</p>}
      {expanded && tip.line && <p className="font-medium">{tip.line}</p>}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          dismissForToday();
          setHidden(true);
        }}
        className="absolute right-1 top-1 rounded p-1 text-[var(--lv-text-secondary)] hover:text-[var(--lv-accent)]"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </section>
  );
};

export default SrsTipCard;
