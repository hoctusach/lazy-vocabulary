import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useProStatus } from '@/hooks/useProStatus';
import { getProProduct, purchasePro, restorePro, type ProProduct } from '@/services/billing/billingService';
import { PRO_FEATURES, type ProFeature } from '@/services/billing/proFeatures';
import { closeProUpgrade, getProUpgradeState, subscribeProUpgrade } from '@/services/billing/proUpgradeStore';

type Load = 'loading' | 'ready' | 'unavailable';

const BENEFITS: Record<ProFeature, string> = {
  noAds: 'No ads',
  importSets: 'Import your own word sets (CSV, Excel)',
  unlimitedQuiz: 'Unlimited “Quiz me”',
  allThemes: 'All 5 themes',
  maleVoice: 'Natural male voice (Michael)',
  editTranslation: 'Edit translations on your word cards',
  unlimitedScans: 'Unlimited “Scan text”',
};

const LEAD: Partial<Record<ProFeature, string>> = {
  unlimitedQuiz: "You've done today's free quiz. Come back tomorrow or unlock unlimited quizzes with Pro.",
  importSets: 'Importing your own word sets is part of Pro.',
  allThemes: 'Cozy Sloth is free. The other themes are part of Pro.',
  maleVoice: 'The natural male voice is part of Pro.',
  editTranslation: 'Editing translations on word cards is part of Pro.',
  noAds: 'Pro removes all ads.',
  unlimitedScans: 'You have used today’s free scans. Unlock unlimited “Scan text” with Pro.',
};

const DEFAULT_LEAD = 'One-time purchase. Learning, listening, built-in sets and the friends leaderboard stay free.';

/** The one reusable upgrade sheet. Mounted once at the app root; open it with openProUpgrade(feature). */
const ProUpgradeSheet: React.FC = () => {
  const { open, feature } = useSyncExternalStore(subscribeProUpgrade, getProUpgradeState, getProUpgradeState);
  const { isPro } = useProStatus();
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
        toast.success('Pro unlocked — thank you!');
        closeProUpgrade();
      } else if (r.status === 'pending') {
        setMessage('Payment pending. Pro will unlock once the payment completes.');
      } else if (r.status === 'error') {
        setMessage(r.message ?? ('Purchase failed. Please try again.'));
      }
      // 'cancelled': silently stay on the sheet
    } catch {
      setMessage('Purchase failed. Please try again.');
    } finally {
      setBusy(null);
    }
  }, [busy]);

  const restore = useCallback(async () => {
    if (busy) return;
    setBusy('restore');
    setMessage(null);
    try {
      const r = await restorePro();
      if (r.status === 'purchased') {
        toast.success('Purchase restored — thank you!');
        closeProUpgrade();
      } else {
        setMessage(r.message ?? ('No purchase found.'));
      }
    } catch {
      setMessage('Could not restore your purchase.');
    } finally {
      setBusy(null);
    }
  }, [busy]);

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
            {isPro ? 'Pro unlocked ✓' : 'Unlock Lazy Vocabulary Pro'}
          </SheetTitle>
          <SheetDescription data-testid="pro-lead" style={{ color: 'var(--lv-text-secondary)' }}>
            {lead}
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
                <span>{BENEFITS[f]}</span>
              </li>
            );
          })}
        </ul>

        {!isPro && (
          <div className="mt-5 space-y-3">
            {load === 'unavailable' ? (
              <p className="text-sm font-semibold" role="status" data-testid="pro-coming-soon" style={{ color: 'var(--lv-heading)' }}>
                {'Pro is coming soon'}
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
                    {load === 'loading' ? 'Loading price…' : 'Processing…'}
                  </>
                ) : (
                  `Buy Pro — ${product?.priceString ?? ''}`
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
              Restore purchases
            </Button>
            <p className="text-xs" data-testid="pro-restore-help" style={{ color: 'var(--lv-text-secondary)' }}>
              Use this if you already bought Pro, or after you get a new phone or reinstall the app.
            </p>
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
