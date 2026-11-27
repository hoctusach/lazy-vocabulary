/**
 * Pro entitlement store. Pure and dependency-free: localStorage-backed with an
 * in-memory fallback so a throwing/blocked storage never breaks the app.
 */
export const PRO_STORAGE_KEY = 'lazyVoca.pro.v1';

export interface ProEntitlement {
  active: boolean;
  productId: string;
  purchaseToken?: string;
  orderId?: string;
  updatedAt: number;
}

type Listener = (active: boolean) => void;

let memory: ProEntitlement | null = null;
const listeners = new Set<Listener>();

function readStored(): ProEntitlement | null {
  try {
    const raw = localStorage.getItem(PRO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && typeof parsed.active === 'boolean') {
        return parsed as ProEntitlement;
      }
    }
    return memory;
  } catch {
    return memory;
  }
}

export function getProEntitlement(): ProEntitlement | null {
  return readStored();
}

export function isProActive(): boolean {
  return readStored()?.active === true;
}

function write(value: ProEntitlement | null): void {
  const before = isProActive();
  memory = value;
  try {
    if (value) localStorage.setItem(PRO_STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(PRO_STORAGE_KEY);
  } catch {
    /* memory fallback already set */
  }
  const after = isProActive();
  if (before !== after) {
    listeners.forEach((l) => {
      try {
        l(after);
      } catch {
        /* listener errors must not break others */
      }
    });
  }
}

export function setProEntitlement(info: Partial<Omit<ProEntitlement, 'active' | 'updatedAt'>> & { productId?: string } = {}): void {
  write({
    active: true,
    productId: info.productId ?? 'pro_unlock',
    purchaseToken: info.purchaseToken,
    orderId: info.orderId,
    updatedAt: Date.now(),
  });
}

export function clearProEntitlement(): void {
  write(null);
}

/** Subscribe to active-state changes. Returns an unsubscribe function. */
export function subscribeProEntitlement(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export const unsubscribeProEntitlement = (listener: Listener): void => {
  listeners.delete(listener);
};

/** Test helper. */
export function __resetEntitlementForTests(): void {
  memory = null;
  listeners.clear();
  try {
    localStorage.removeItem(PRO_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
