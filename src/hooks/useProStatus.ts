import { useEffect, useState } from 'react';
import { isProActive, subscribeProEntitlement } from '@/services/billing/entitlement';
import { isBillingSupported } from '@/services/billing/billingService';

export function useProStatus(): { isPro: boolean; supported: boolean } {
  const [isPro, setIsPro] = useState<boolean>(() => isProActive());
  useEffect(() => {
    setIsPro(isProActive());
    return subscribeProEntitlement(setIsPro);
  }, []);
  return { isPro, supported: isBillingSupported() };
}
