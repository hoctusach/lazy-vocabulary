import React from 'react';
import { Button } from '@/components/ui/button';
import { useProStatus } from '@/hooks/useProStatus';
import { openProUpgrade } from '@/services/billing/proUpgradeStore';

/** More-tab entry: opens the shared upgrade sheet; owners just see "Pro unlocked ✓". */
const ProCard: React.FC = () => {
  const { isPro } = useProStatus();

  return (
    <div
      className="lv-section p-4 pl-5"
      data-testid="pro-card"
    >
      <h3 className="lv-section-title">
        {isPro ? 'Pro unlocked ✓' : 'Lazy Vocabulary Pro'}
      </h3>
      {isPro ? (
        <p className="mt-1 text-sm leading-relaxed" data-testid="pro-active" style={{ color: 'var(--lv-text-secondary)' }}>
          Thank you for your support!
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--lv-text-secondary)' }}>
            One-time purchase: no ads, your own word sets, unlimited quizzes, all themes and the male voice.
          </p>
          <div className="mt-3">
            <Button className="min-h-11" onClick={() => openProUpgrade(null)} data-testid="pro-open">
              See Pro
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProCard;
