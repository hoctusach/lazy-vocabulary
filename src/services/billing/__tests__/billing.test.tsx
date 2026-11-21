// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react';

const platform = { native: true, name: 'android' };
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => platform.native, getPlatform: () => platform.name },
}));

const plugin = vi.hoisted(() => ({
  getPurchases: vi.fn(),
  getProducts: vi.fn(),
  purchaseProduct: vi.fn(),
  restorePurchases: vi.fn(),
  acknowledgePurchase: vi.fn(),
}));
vi.mock('@capgo/native-purchases', () => ({
  NativePurchases: plugin,
  PURCHASE_TYPE: { INAPP: 'inapp', SUBS: 'subs' },
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/components/UserGreeting', () => ({ default: () => null }));
vi.mock('@/components/ThemeSwitcher', () => ({ default: () => null }));
vi.mock('@/components/NotificationManager', () => ({ default: () => null }));
vi.mock('@/services/speech/nativeTts', () => ({ isNativePlatform: () => platform.native }));

import * as ent from '../entitlement';
import * as billing from '../billingService';
import { adsAllowed, onAdsAllowedChange } from '@/hooks/useAdsVisibility';
import MorePanel from '@/components/mobile/MorePanel';

const owned = (o: Record<string, unknown> = {}) => ({
  productIdentifier: 'pro_unlock', purchaseState: '1', isAcknowledged: true, purchaseToken: 'tok', orderId: 'GPA.1', ...o,
});

afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

beforeEach(() => {
  vi.stubEnv('VITE_ENABLE_PRO', 'true');
  platform.native = true;
  platform.name = 'android';
  Object.values(plugin).forEach((f) => f.mockReset());
  plugin.getProducts.mockResolvedValue({ products: [{ identifier: 'pro_unlock', title: 'Pro', description: 'd', priceString: '49.000 ₫', price: 49000, currencyCode: 'VND' }] });
  plugin.restorePurchases.mockResolvedValue(undefined);
  plugin.acknowledgePurchase.mockResolvedValue(undefined);
  ent.__resetEntitlementForTests();
  billing.__resetBillingForTests();
});

describe('entitlement', () => {
  it('persists and clears', () => {
    expect(ent.isProActive()).toBe(false);
    ent.setProEntitlement({ purchaseToken: 't', orderId: 'o' });
    expect(ent.isProActive()).toBe(true);
    expect(JSON.parse(localStorage.getItem('lazyVoca.pro.v1')!)).toMatchObject({ active: true, productId: 'pro_unlock', purchaseToken: 't', orderId: 'o' });
    ent.clearProEntitlement();
    expect(ent.isProActive()).toBe(false);
  });
  it('notifies listeners only on change and supports unsubscribe', () => {
    const cb = vi.fn();
    const off = ent.subscribeProEntitlement(cb);
    ent.setProEntitlement();
    ent.setProEntitlement();
    expect(cb).toHaveBeenCalledTimes(1);
    off();
    ent.clearProEntitlement();
    expect(cb).toHaveBeenCalledTimes(1);
  });
  it('falls back to memory when localStorage throws', () => {
    const g = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('x'); });
    const s = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('x'); });
    ent.setProEntitlement();
    expect(ent.isProActive()).toBe(true);
    ent.clearProEntitlement();
    expect(ent.isProActive()).toBe(false);
    g.mockRestore(); s.mockRestore();
  });
});

describe('adsAllowed', () => {
  it('flips with entitlement', () => {
    const cb = vi.fn();
    const off = onAdsAllowedChange(cb);
    expect(adsAllowed()).toBe(true);
    ent.setProEntitlement();
    expect(adsAllowed()).toBe(false);
    expect(cb).toHaveBeenLastCalledWith(false);
    ent.clearProEntitlement();
    expect(cb).toHaveBeenLastCalledWith(true);
    off();
  });
});

describe('initBilling', () => {
  it('grants when owned', async () => {
    plugin.getPurchases.mockResolvedValue({ purchases: [owned()] });
    await billing.initBilling();
    expect(ent.isProActive()).toBe(true);
    expect(plugin.acknowledgePurchase).not.toHaveBeenCalled();
  });
  it('clears when query succeeds empty', async () => {
    ent.setProEntitlement();
    plugin.getPurchases.mockResolvedValue({ purchases: [] });
    await billing.initBilling();
    expect(ent.isProActive()).toBe(false);
  });
  it('keeps cache on failure', async () => {
    ent.setProEntitlement();
    plugin.getPurchases.mockRejectedValue(new Error('network'));
    await expect(billing.initBilling()).resolves.toBeUndefined();
    expect(ent.isProActive()).toBe(true);
  });
  it('acknowledges unacknowledged purchases', async () => {
    plugin.getPurchases.mockResolvedValue({ purchases: [owned({ isAcknowledged: false })] });
    await billing.initBilling();
    expect(plugin.acknowledgePurchase).toHaveBeenCalledWith({ purchaseToken: 'tok' });
  });
  it('does not grant a pending purchase', async () => {
    plugin.getPurchases.mockResolvedValue({ purchases: [owned({ purchaseState: '0' })] });
    await billing.initBilling();
    expect(ent.isProActive()).toBe(false);
  });
});

describe('purchasePro', () => {
  it('purchased (non-consumable)', async () => {
    plugin.purchaseProduct.mockResolvedValue(owned());
    expect(await billing.purchasePro()).toEqual({ status: 'purchased' });
    expect(plugin.purchaseProduct).toHaveBeenCalledWith(expect.objectContaining({ productIdentifier: 'pro_unlock', isConsumable: false }));
    expect(ent.isProActive()).toBe(true);
  });
  it('cancelled', async () => {
    plugin.purchaseProduct.mockRejectedValue({ code: 'USER_CANCELED', message: 'Purchase is not purchased' });
    expect((await billing.purchasePro()).status).toBe('cancelled');
    expect(ent.isProActive()).toBe(false);
  });
  it('pending does not grant', async () => {
    plugin.purchaseProduct.mockResolvedValue(owned({ purchaseState: '0' }));
    expect((await billing.purchasePro()).status).toBe('pending');
    expect(ent.isProActive()).toBe(false);
  });
  it('error', async () => {
    plugin.purchaseProduct.mockRejectedValue({ code: 'ERROR', message: 'boom' });
    expect(await billing.purchasePro()).toEqual({ status: 'error', message: 'boom' });
  });
  it('guards double taps', async () => {
    let resolve!: (v: unknown) => void;
    plugin.purchaseProduct.mockReturnValue(new Promise((r) => { resolve = r; }));
    const a = billing.purchasePro();
    const b = billing.purchasePro();
    resolve(owned());
    await Promise.all([a, b]);
    expect(plugin.purchaseProduct).toHaveBeenCalledTimes(1);
  });
});

describe('restorePro', () => {
  it('restores owned', async () => {
    plugin.getPurchases.mockResolvedValue({ purchases: [owned()] });
    expect((await billing.restorePro()).status).toBe('purchased');
    expect(ent.isProActive()).toBe(true);
  });
  it('reports nothing found', async () => {
    plugin.getPurchases.mockResolvedValue({ purchases: [] });
    expect((await billing.restorePro()).status).toBe('error');
  });
});

describe('web / ios no-op', () => {
  it.each([[false, 'web'], [true, 'ios']])('native=%s platform=%s', async (native, name) => {
    platform.native = native; platform.name = name;
    expect(billing.isBillingSupported()).toBe(false);
    await billing.initBilling();
    expect(await billing.getProProduct()).toBeNull();
    expect((await billing.purchasePro()).status).toBe('error');
    expect(plugin.getPurchases).not.toHaveBeenCalled();
    expect(plugin.purchaseProduct).not.toHaveBeenCalled();
  });
  it('MorePanel hides the card on web', () => {
    platform.native = false; platform.name = 'web';
    render(<MorePanel />);
    expect(screen.queryByTestId('pro-card')).toBeNull();
  });
});

describe('MorePanel Pro card', () => {
  it('shows localised price from Play', async () => {
    render(<MorePanel />);
    expect(screen.getByText('Loading price…')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('pro-buy').textContent).toContain('49.000 ₫'));
    expect((screen.getByTestId('pro-buy') as HTMLButtonElement).disabled).toBe(false);
  });
  it('shows unavailable when product cannot load', async () => {
    plugin.getProducts.mockResolvedValue({ products: [] });
    render(<MorePanel />);
    await waitFor(() => expect(screen.getByTestId('pro-buy').textContent).toContain('Not available right now'));
    expect((screen.getByTestId('pro-buy') as HTMLButtonElement).disabled).toBe(true);
  });
  it('shows Pro-active state and no buy button', async () => {
    ent.setProEntitlement();
    render(<MorePanel />);
    expect(screen.getByTestId('pro-active').textContent).toContain('Pro active');
    expect(screen.queryByTestId('pro-buy')).toBeNull();
  });
  it('buy flips to Pro-active', async () => {
    plugin.purchaseProduct.mockResolvedValue(owned());
    render(<MorePanel />);
    await waitFor(() => expect((screen.getByTestId('pro-buy') as HTMLButtonElement).disabled).toBe(false));
    await act(async () => { fireEvent.click(screen.getByTestId('pro-buy')); });
    await waitFor(() => expect(screen.getByTestId('pro-active')).toBeTruthy());
  });
});
