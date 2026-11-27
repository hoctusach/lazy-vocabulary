import React from 'react';
import { Lock } from 'lucide-react';

/** Small, theme-aware "Pro" lock marker. Decorative inside a >=44px button, which carries the real tap target. */
const ProBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    role="img"
    aria-label="Pro feature"
    data-testid="pro-badge"
    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold leading-none ${className}`}
    style={{
      background: 'var(--lv-accent-soft)',
      color: 'var(--lv-heading)',
      borderColor: 'var(--lv-accent)',
    }}
  >
    <Lock className="h-3 w-3" aria-hidden="true" />
    Pro
  </span>
);

export default ProBadge;
