import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useProStatus } from '@/hooks/useProStatus';
import { useIsVietnameseDevice } from '@/utils/deviceLanguage';
import { getProProduct, purchasePro, restorePro, type ProProduct } from '@/services/billing/billingService';
import { PRO_FEATURES, type ProFeature } from '@/services/billing/proFeatures';
import { closeProUpgrade, getProUpgradeState, subscribeProUpgrade } from '@/services/billing/proUpgradeStore';

type Load = 'loading' | 'ready' | 'unavailable';

const BENEFITS: Record<ProFeature, { en: string; vi: string }> = {
  noAds: { en: 'No ads', vi: 'Không quảng cáo' },
  importSets: { en: 'Import your own word sets (CSV, Excel)', vi: 'Nhập bộ từ riêng (CSV, Excel, JSON)' },
  unlimitedQuiz: { en: 'Unlimited “Quiz me”', vi: '“Quiz me” không giới hạn' },
  allThemes: { en: 'All 5 themes', vi: 'Cả 5 giao diện' },
  maleVoice: { en: 'Natural male voice (Michael)', vi: 'Giọng nam tự nhiên (Michael)' },
  editTranslation: { en: 'Edit translations on your word cards', vi: 'Sửa bản dịch trên thẻ từ của bạn' },
};

const LEAD: Partial<Record<ProFeature, { en: string; vi: string }>> = {
  unlimitedQuiz: {
    en: "You've done today's free quiz. Come back tomorrow or unlock unlimited quizzes with Pro.",
    vi: 'Bạn đã làm bài quiz miễn phí hôm nay. Hãy quay lại vào ngày mai hoặc mở khóa quiz không giới hạn với Pro.',
  },
  importSets: {
    en: 'Importing your own word sets is part of Pro.',
    vi: 'Nhập bộ từ riêng là một phần của Pro.',
  },
  allThemes: {
    en: 'Cozy Sloth is free. The other themes are part of Pro.',
    vi: 'Cozy Sloth miễn phí. Các giao diện khác thuộc về Pro.',
  },
  maleVoice: {
    en: 'The natural male voice is part of Pro.',
    vi: 'Giọng nam tự nhiên thuộc về Pro.',
  },
  editTranslation: {
    en: 'Editing translations on word cards is part of Pro.',
    vi: 'Sửa bản dịch trên thẻ từ thuộc về Pro.',
  },
  noAds: { en: 'Pro removes all ads.', vi: 'Pro loại bỏ toàn bộ quảng cáo.' },
};

const DEFAULT_LEAD = {
  en: 'One-time purchase. Learning, listening, built-in sets and the friends leaderboard stay free.',
  vi: 'Mua một lần. Học, nghe, bộ từ có sẵn và bảng xếp hạng bạn bè vẫn miễn phí.',
};

/** The one reusable upgrade sheet. Mounted once at the app root; open it with openProUpgrade(feature). */
const ProUpgradeSheet: React.FC = () => {
  const { open, feature } = useSyncExternalStore(subscribeProUpgrade, getProUpgradeState, getProUpgradeState);
  const { isPro } = useProStatus();
  const isVi = useIsVietnameseDevice();
  const t = (x: { en: string; vi: string }) => (isVi ? x.vi : x.en);
  const [product, setProduct] = useState<ProProduct | null>(null);
  const [load, setLoad] = useState<Load>('loading');
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || isPro) return;
    let cancelled = false;
    setLoad('loading');
    setMessage(null);
    Promise.resolve()
      .then(() => getProProduct())
      .catch(() => null)
      .then((p) => {
        if (cancelled) return;
        setProduct(p ?? null);
        setLoad(p ? 'ready' : 'unavailable');
      });
    return () => { cancelled = true; };
  }, [open, isPro]);

  // Unlocked while open (purchase, restore, late PENDING completion): close.
  useEffect(() => {
    if (open && isPro && busy === null) closeProUpgrade();
  }, [open, isPro, busy]);

  const buy = useCallback(async () => {
    if (busy) return;
    setBusy('buy');
    setMessage(null);
    try {
      const r = await purchasePro();
      if (r.status === 'purchased') {
        toast.success(isVi ? 'Đã mở khóa Pro — cảm ơn bạn!' : 'Pro unlocked — thank you!');
        closeProUpgrade();
      } else if (r.status === 'pending') {
        setMessage(isVi ? 'Thanh toán đang chờ xử lý. Pro sẽ mở khóa khi hoàn tất.' : 'Payment pending. Pro will unlock once the payment completes.');
      } else if (r.status === 'error') {
        setMessage(r.message ?? (isVi ? 'Không thể mua lúc này.' : 'Purchase failed. Please try again.'));
      }
      // 'cancelled': silently stay on the sheet
    } catch {
      setMessage(isVi ? 'Không thể mua lúc này.' : 'Purchase failed. Please try again.');
    } finally {
      setBusy(null);
    }
  }, [busy, isVi]);

  const restore = useCallback(async () => {
    if (busy) return;
    setBusy('restore');
    setMessage(null);
    try {
      const r = await restorePro();
      if (r.status === 'purchased') {
        toast.success(isVi ? 'Đã khôi phục giao dịch — cảm ơn bạn!' : 'Purchase restored — thank you!');
        closeProUpgrade();
      } else {
        setMessage(r.message ?? (isVi ? 'Không tìm thấy giao dịch.' : 'No purchase found.'));
      }
    } catch {
      setMessage(isVi ? 'Không thể khôi phục lúc này.' : 'Could not restore purchase.');
    } finally {
      setBusy(null);
    }
  }, [busy, isVi]);

  const lead = (feature && LEAD[feature]) || DEFAULT_LEAD;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) closeProUpgrade(); }}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-2xl theme-card-surface"
        data-testid="pro-upgrade-sheet"
        data-trigger={feature ?? ''}
      >
        <SheetHeader className="text-left">
          <SheetTitle style={{ color: 'var(--lv-heading)' }}>
            {isPro ? (isVi ? 'Pro đã mở khóa ✓' : 'Pro unlocked ✓') : isVi ? 'Mở khóa Lazy Vocabulary Pro' : 'Unlock Lazy Vocabulary Pro'}
          </SheetTitle>
          <SheetDescription data-testid="pro-lead" style={{ color: 'var(--lv-text-secondary)' }}>
            {t(lead)}
          </SheetDescription>
        </SheetHeader>

        <ul className="mt-4 space-y-2" data-testid="pro-benefits">
          {PRO_FEATURES.map((f) => {
            const hi = f === feature;
            return (
              <li
                key={f}
                data-feature={f}
                data-highlight={hi ? 'true' : 'false'}
                className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm"
                style={{
                  background: hi ? 'var(--lv-accent-soft)' : undefined,
                  color: 'var(--lv-heading)',
                  fontWeight: hi ? 700 : 500,
                }}
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--lv-accent)' }} aria-hidden="true" />
                <span>{t(BENEFITS[f])}</span>
              </li>
            );
          })}
        </ul>

        {!isPro && (
          <div className="mt-5 space-y-3">
            {load === 'unavailable' ? (
              <p className="text-sm font-semibold" role="status" data-testid="pro-coming-soon" style={{ color: 'var(--lv-heading)' }}>
                {isVi ? 'Pro sắp ra mắt' : 'Pro is coming soon'}
              </p>
            ) : (
              <Button
                className="min-h-11 w-full"
                onClick={() => void buy()}
                disabled={load !== 'ready' || busy !== null}
                data-testid="pro-buy"
              >
                {busy === 'buy' || load === 'loading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    {load === 'loading' ? (isVi ? 'Đang tải giá…' : 'Loading price…') : isVi ? 'Đang xử lý…' : 'Processing…'}
                  </>
                ) : (
                  `${isVi ? 'Mua Pro' : 'Buy Pro'} — ${product?.priceString ?? ''}`
                )}
              </Button>
            )}
            <Button
              variant="outline"
              className="min-h-11 w-full"
              onClick={() => void restore()}
              disabled={busy !== null}
              data-testid="pro-restore"
            >
              {busy === 'restore' && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isVi ? 'Khôi phục giao dịch' : 'Restore purchase'}
            </Button>
            {message && (
              <p role="status" data-testid="pro-message" className="text-sm" style={{ color: 'var(--lv-text-secondary)' }}>
                {message}
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ProUpgradeSheet;
