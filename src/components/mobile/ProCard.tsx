import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useProStatus } from '@/hooks/useProStatus';
import { getProProduct, purchasePro, restorePro, type ProProduct } from '@/services/billing/billingService';

type Load = 'loading' | 'ready' | 'unavailable';

const ProCard: React.FC = () => {
  const { isPro } = useProStatus();
  const [product, setProduct] = useState<ProProduct | null>(null);
  const [load, setLoad] = useState<Load>('loading');
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  useEffect(() => {
    if (isPro) return;
    let cancelled = false;
    setLoad('loading');
    void getProProduct().then((p) => {
      if (cancelled) return;
      setProduct(p);
      setLoad(p ? 'ready' : 'unavailable');
    });
    return () => {
      cancelled = true;
    };
  }, [isPro]);

  const buy = useCallback(async () => {
    if (busy) return;
    setBusy('buy');
    try {
      const r = await purchasePro();
      if (r.status === 'purchased') toast.success('Pro unlocked — thank you!');
      else if (r.status === 'pending') toast(r.message ?? 'Purchase pending.');
      else if (r.status === 'error') toast.error(r.message ?? 'Purchase failed.');
    } finally {
      setBusy(null);
    }
  }, [busy]);

  const restore = useCallback(async () => {
    if (busy) return;
    setBusy('restore');
    try {
      const r = await restorePro();
      if (r.status === 'purchased') toast.success('Purchase restored — thank you!');
      else toast(r.message ?? 'No purchase found.');
    } finally {
      setBusy(null);
    }
  }, [busy]);

  return (
    <div
      className="rounded-2xl border p-4 theme-card-surface"
      style={{ borderColor: 'var(--lv-border-color)' }}
      data-testid="pro-card"
    >
      <h3 className="text-base font-semibold" style={{ color: 'var(--lv-heading)' }}>
        Go Pro / Remove ads
      </h3>
      <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--lv-text-secondary)' }}>
        One-time purchase. Removes ads. All content stays free.
      </p>
      {isPro ? (
        <p className="mt-3 text-sm font-medium" data-testid="pro-active">
          Pro active — thank you!
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={buy} disabled={load !== 'ready' || busy !== null} data-testid="pro-buy">
            {busy === 'buy' || load === 'loading' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {load === 'loading' ? 'Loading price…' : 'Processing…'}
              </>
            ) : load === 'ready' && product ? (
              `Buy Pro · ${product.priceString}`
            ) : (
              'Not available right now'
            )}
          </Button>
          <Button variant="outline" onClick={restore} disabled={busy !== null} data-testid="pro-restore">
            {busy === 'restore' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Restore purchase
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProCard;
