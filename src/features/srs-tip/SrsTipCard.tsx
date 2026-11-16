import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useIsVietnameseDevice } from '@/utils/deviceLanguage';
import { buildSrsTip, dismissForToday, isDismissedToday } from './srsTip';

interface SrsTipCardProps {
  total: number;
  due: number;
}

const SrsTipCard: React.FC<SrsTipCardProps> = ({ total, due }) => {
  const isVi = useIsVietnameseDevice();
  const [hidden, setHidden] = useState<boolean>(() => isDismissedToday());
  if (hidden) return null;
  const tip = buildSrsTip({ isVietnamese: isVi, total, due });

  return (
    <section
      data-testid="srs-tip"
      data-kind={tip.kind}
      className="relative mb-2 rounded-lg border border-[var(--lv-border)] bg-[var(--lv-card-bg)] py-1.5 pl-3 pr-8 text-xs leading-snug text-[var(--lv-text-secondary)]"
    >
      <p className="font-semibold text-[var(--lv-accent)]">{tip.title}</p>
      {tip.body && <p>{tip.body}</p>}
      {tip.line && <p className="font-medium">{tip.line}</p>}
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
