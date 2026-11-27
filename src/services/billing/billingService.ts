import { Capacitor } from '@capacitor/core';
import { clearProEntitlement, isProActive, setProEntitlement } from './entitlement';

export const PRO_PRODUCT_ID = 'pro_unlock';

export interface ProProduct {
  identifier: string;
  title: string;
  description: string;
  /** Localised price string from Google Play (never hard-coded). */
  priceString: string;
  price: number;
  currencyCode: string;
}

export type PurchaseResult = { status: 'purchased' | 'cancelled' | 'pending' | 'error'; message?: string };

type Plugin = typeof import('@capgo/native-purchases');
let pluginPromise: Promise<Plugin> | null = null;
const loadPlugin = () => (pluginPromise ??= import('@capgo/native-purchases'));

export function isBillingSupported(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

interface OwnedTx {
  productIdentifier?: string;
  purchaseState?: string;
  isAcknowledged?: boolean;
  purchaseToken?: string;
  transactionId?: string;
  orderId?: string;
}

const tokenOf = (t: OwnedTx) => t.purchaseToken ?? t.transactionId;

/** Grants/acknowledges from a list of owned purchases. Returns true if Pro owned. */
async function applyOwned(purchases: OwnedTx[], api: Plugin['NativePurchases']): Promise<boolean> {
  const pro = purchases.find((p) => p.productIdentifier === PRO_PRODUCT_ID && p.purchaseState === '1');
  if (!pro) return false;
  setProEntitlement({ productId: PRO_PRODUCT_ID, purchaseToken: tokenOf(pro), orderId: pro.orderId });
  const token = tokenOf(pro);
  if (pro.isAcknowledged === false && token) {
    try {
      await api.acknowledgePurchase({ purchaseToken: token });
    } catch (e) {
      console.warn('[billing] acknowledge failed', e);
    }
  }
  return true;
}

async function queryOwned(api: Plugin['NativePurchases'], PURCHASE_TYPE: Plugin['PURCHASE_TYPE']): Promise<OwnedTx[]> {
  const { purchases } = await api.getPurchases({ productType: PURCHASE_TYPE.INAPP });
  return (purchases ?? []) as OwnedTx[];
}

/** Resolves to `fallback` if `p` neither settles nor throws within `ms` (a hung Play/plugin call must not hang the UI). */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      () => { clearTimeout(timer); resolve(fallback); },
    );
  });
}

export const PRODUCT_TIMEOUT_MS = 8000;
export const RESTORE_TIMEOUT_MS = 20000;

let initStarted = false;

/** Call once at launch. Never throws. Only clears the cache after a successful query without pro_unlock. */
export async function initBilling(): Promise<void> {
  if (!isBillingSupported() || initStarted) return;
  initStarted = true;
  try {
    const { NativePurchases, PURCHASE_TYPE } = await loadPlugin();
    const owned = await queryOwned(NativePurchases, PURCHASE_TYPE);
    const hasPro = await applyOwned(owned, NativePurchases);
    if (!hasPro) {
      // A PENDING pro purchase is not owned yet; keep cache untouched only if query failed (handled in catch).
      clearProEntitlement();
    }
  } catch (e) {
    console.warn('[billing] init failed; keeping cached entitlement', e);
  }
}

let cachedProduct: ProProduct | null = null;

/** Play product details, or null when billing/product is unavailable (never throws, never hangs). */
export function getProProduct(): Promise<ProProduct | null> {
  return withTimeout(loadProProduct(), PRODUCT_TIMEOUT_MS, null);
}

async function loadProProduct(): Promise<ProProduct | null> {
  if (!isBillingSupported()) return null;
  if (cachedProduct) return cachedProduct;
  try {
    const { NativePurchases, PURCHASE_TYPE } = await loadPlugin();
    const { products } = await NativePurchases.getProducts({
      productIdentifiers: [PRO_PRODUCT_ID],
      productType: PURCHASE_TYPE.INAPP,
    });
    const p = products?.find((x) => x.identifier === PRO_PRODUCT_ID) ?? products?.[0];
    if (!p || !p.priceString) return null;
    cachedProduct = {
      identifier: p.identifier,
      title: p.title,
      description: p.description,
      priceString: p.priceString,
      price: p.price,
      currencyCode: p.currencyCode,
    };
    return cachedProduct;
  } catch (e) {
    console.warn('[billing] getProducts failed', e);
    return null;
  }
}

let purchaseInFlight: Promise<PurchaseResult> | null = null;

export function purchasePro(): Promise<PurchaseResult> {
  if (!isBillingSupported()) return Promise.resolve({ status: 'error', message: 'Purchases are not available on this device.' });
  if (purchaseInFlight) return purchaseInFlight;
  purchaseInFlight = doPurchase().finally(() => {
    purchaseInFlight = null;
  });
  return purchaseInFlight;
}

async function doPurchase(): Promise<PurchaseResult> {
  try {
    const { NativePurchases, PURCHASE_TYPE } = await loadPlugin();
    const tx = (await NativePurchases.purchaseProduct({
      productIdentifier: PRO_PRODUCT_ID,
      productType: PURCHASE_TYPE.INAPP,
      isConsumable: false, // non-consumable: never consume
      autoAcknowledgePurchases: true, // plugin acknowledges (required within 3 days)
    })) as OwnedTx;
    if (tx.purchaseState === '0') return { status: 'pending', message: 'Your purchase is pending. Pro will unlock once payment completes.' };
    if (tx.purchaseState !== undefined && tx.purchaseState !== '1') {
      return { status: 'error', message: 'Purchase could not be completed.' };
    }
    setProEntitlement({ productId: PRO_PRODUCT_ID, purchaseToken: tokenOf(tx), orderId: tx.orderId });
    if (tx.isAcknowledged === false && tokenOf(tx)) {
      try {
        await NativePurchases.acknowledgePurchase({ purchaseToken: tokenOf(tx)! });
      } catch (e) {
        console.warn('[billing] acknowledge failed (will retry on next launch)', e);
      }
    }
    return { status: 'purchased' };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const text = `${err?.code ?? ''} ${err?.message ?? ''}`;
    if (/USER_CANCEL/i.test(text) || /cancel/i.test(text)) return { status: 'cancelled' };
    if (/ITEM_ALREADY_OWNED/i.test(text)) {
      const r = await restorePro();
      return r.status === 'purchased' ? r : { status: 'error', message: r.message };
    }
    if (/pending/i.test(text)) return { status: 'pending', message: 'Your purchase is pending. Pro will unlock once payment completes.' };
    return { status: 'error', message: err?.message || 'Purchase failed. Please try again.' };
  }
}

let restoreInFlight: Promise<PurchaseResult> | null = null;

/** Re-query Play for owned purchases. 'purchased' = Pro restored; 'error' with message otherwise. */
export function restorePro(): Promise<PurchaseResult> {
  if (!isBillingSupported()) return Promise.resolve({ status: 'error', message: 'Purchases are not available on this device.' });
  if (restoreInFlight) return restoreInFlight;
  restoreInFlight = withTimeout<PurchaseResult>(doRestore(), RESTORE_TIMEOUT_MS, {
    status: 'error',
    message: 'Could not reach Google Play. Please try again.',
  }).finally(() => {
    restoreInFlight = null;
  });
  return restoreInFlight;
}

async function doRestore(): Promise<PurchaseResult> {
  try {
    const { NativePurchases, PURCHASE_TYPE } = await loadPlugin();
    try {
      await NativePurchases.restorePurchases();
    } catch (e) {
      console.warn('[billing] restorePurchases failed, falling back to query', e);
    }
    const owned = await queryOwned(NativePurchases, PURCHASE_TYPE);
    if (await applyOwned(owned, NativePurchases)) return { status: 'purchased' };
    return { status: 'error', message: 'No previous purchase found for this Google account.' };
  } catch (e) {
    return { status: 'error', message: (e as Error)?.message || 'Could not restore purchase. Please try again.' };
  }
}

export { isProActive };

/** Test helper. */
export function __resetBillingForTests(): void {
  initStarted = false;
  cachedProduct = null;
  purchaseInFlight = null;
  restoreInFlight = null;
}
