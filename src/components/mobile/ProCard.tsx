import React from 'react';
import { Button } from '@/components/ui/button';
import { useProStatus } from '@/hooks/useProStatus';
import { useIsVietnameseDevice } from '@/utils/deviceLanguage';
import { openProUpgrade } from '@/services/billing/proUpgradeStore';

/** More-tab entry: opens the shared upgrade sheet; owners just see "Pro unlocked ✓". */
const ProCard: React.FC = () => {
  const { isPro } = useProStatus();
  const isVi = useIsVietnameseDevice();

  return (
    <div
      className="rounded-2xl border p-4 theme-card-surface"
      style={{ borderColor: 'var(--lv-border-color)' }}
      data-testid="pro-card"
    >
      <h3 className="text-base font-semibold" style={{ color: 'var(--lv-heading)' }}>
        {isPro ? (isVi ? 'Pro đã mở khóa ✓' : 'Pro unlocked ✓') : 'Lazy Vocabulary Pro'}
      </h3>
      {isPro ? (
        <p className="mt-1 text-sm leading-relaxed" data-testid="pro-active" style={{ color: 'var(--lv-text-secondary)' }}>
          {isVi ? 'Cảm ơn bạn đã ủng hộ!' : 'Thank you for your support!'}
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--lv-text-secondary)' }}>
            {isVi
              ? 'Mua một lần: không quảng cáo, nhập bộ từ riêng, quiz không giới hạn, mọi giao diện và giọng nam.'
              : 'One-time purchase: no ads, import your own sets, unlimited quizzes, all themes and the male voice.'}
          </p>
          <div className="mt-3">
            <Button className="min-h-11" onClick={() => openProUpgrade(null)} data-testid="pro-open">
              {isVi ? 'Xem Pro' : 'See Pro'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProCard;
