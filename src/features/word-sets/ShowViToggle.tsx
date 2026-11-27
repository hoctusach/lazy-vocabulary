import React from 'react';
import { useIsVietnameseDevice } from '@/utils/deviceLanguage';
import { useShowDefaultViPref } from '@/lib/translations/showDefaultVi';

/** [FB-64] English devices only: show the built-in Vietnamese translation on cards (off by default). */
const ShowViToggle: React.FC = () => {
  const isVi = useIsVietnameseDevice();
  const [on, setOn] = useShowDefaultViPref();
  if (isVi) return null;
  return (
    <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3 border-t pt-3 text-sm" style={{ borderColor: 'var(--lv-border-color)' }} data-testid="show-vi-toggle">
      <input
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--lv-accent)]"
        checked={on}
        aria-label="Show Vietnamese translation"
        onChange={(e) => setOn(e.target.checked)}
      />
      <span>
        <span className="font-medium">Show Vietnamese translation</span>
        <span className="block text-xs" style={{ color: 'var(--lv-text-secondary)' }}>
          For the C1, C2 words. Your own translations always show.
        </span>
      </span>
    </label>
  );
};

export default ShowViToggle;
