// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react';

const platform = { native: true, name: 'android', pluginMissing: false };
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
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

import * as ent from '../entitlement';
import * as billing from '../billingService';
import { hasFeature, useProFeature, PRO_FEATURES } from '../proFeatures';
import { openProUpgrade, closeProUpgrade, getProUpgradeState, __resetProUpgradeForTests } from '../proUpgradeStore';
import ProUpgradeSheet from '@/components/pro/ProUpgradeSheet';

const owned = () => ({ productIdentifier: 'pro_unlock', purchaseState: '1', isAcknowledged: true, purchaseToken: 'tok', orderId: 'GPA.1' });
const product = { identifier: 'pro_unlock', title: 'Pro', description: 'd', priceString: '49.000 ₫', price: 49000, currencyCode: 'VND' };

beforeEach(() => {
  vi.stubEnv('VITE_ENABLE_PRO', 'true');
  platform.native = true; platform.name = 'android';
  Object.values(plugin).forEach((f) => f.mockReset());
  toast.mockReset(); toast.success.mockReset(); toast.error.mockReset();
  plugin.getProducts.mockResolvedValue({ products: [product] });
  plugin.restorePurchases.mockResolvedValue(undefined);
  plugin.acknowledgePurchase.mockResolvedValue(undefined);
  ent.__resetEntitlementForTests();
  billing.__resetBillingForTests();
  __resetProUpgradeForTests();
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('hasFeature', () => {
  it('flag off: everything is free, even without Pro', () => {
    vi.stubEnv('VITE_ENABLE_PRO', 'false');
    for (const f of PRO_FEATURES) expect(hasFeature(f)).toBe(true);
  });
  it('flag on, not Pro: every Pro feature is locked', () => {
    for (const f of PRO_FEATURES) expect(hasFeature(f)).toBe(false);
  });
  it('flag on, Pro: everything unlocked, and refund re-locks', () => {
    ent.setProEntitlement();
    for (const f of PRO_FEATURES) expect(hasFeature(f)).toBe(true);
    ent.clearProEntitlement();
    expect(hasFeature('allThemes')).toBe(false);
  });
  it('useProFeature re-renders on purchase and on refund', () => {
    const Probe = () => <span data-testid="p">{String(useProFeature('importSets'))}</span>;
    render(<Probe />);
    expect(screen.getByTestId('p').textContent).toBe('false');
    act(() => ent.setProEntitlement());
    expect(screen.getByTestId('p').textContent).toBe('true');
    act(() => ent.clearProEntitlement());
    expect(screen.getByTestId('p').textContent).toBe('false');
  });
});

describe('ProUpgradeSheet', () => {
  const open = async (feature: Parameters<typeof openProUpgrade>[0] = 'allThemes') => {
    render(<ProUpgradeSheet />);
    await act(async () => { openProUpgrade(feature); });
  };

  it('shows benefits, highlights the trigger and the Play price', async () => {
    await open('importSets');
    await waitFor(() => expect(screen.getByTestId('pro-buy').textContent).toBe('Buy Pro — 49.000 ₫'));
    expect(screen.getByTestId('pro-benefits').querySelectorAll('li')).toHaveLength(PRO_FEATURES.length);
    expect(document.querySelector('[data-feature="importSets"]')?.getAttribute('data-highlight')).toBe('true');
    expect(document.querySelector('[data-feature="noAds"]')?.getAttribute('data-highlight')).toBe('false');
    expect(screen.getByTestId('pro-restore')).toBeTruthy();
  });

  it('quiz trigger shows the daily-limit copy', async () => {
    await open('unlimitedQuiz');
    expect(screen.getByTestId('pro-lead').textContent).toBe(
      "You've done today's free quiz. Come back tomorrow or unlock unlimited quizzes with Pro."
    );
  });

  it('web (no billing): "Pro is coming soon", no Buy, benefits still listed, nothing throws', async () => {
    platform.native = false; platform.name = 'web';
    await open();
    await waitFor(() => expect(screen.getByTestId('pro-coming-soon').textContent).toBe('Pro is coming soon'));
    expect(screen.queryByTestId('pro-buy')).toBeNull();
    expect(screen.getByTestId('pro-benefits')).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByTestId('pro-restore')); });
    await waitFor(() => expect(screen.getByTestId('pro-message')).toBeTruthy());
  });

  it.each([
    ['getProducts throws', () => plugin.getProducts.mockRejectedValue(new Error('boom'))],
    ['product not created yet (empty)', () => plugin.getProducts.mockResolvedValue({ products: [] })],
    ['getProducts resolves undefined', () => plugin.getProducts.mockResolvedValue(undefined)],
  ])('billing available but %s: coming soon', async (_n, arrange) => {
    arrange();
    await open();
    await waitFor(() => expect(screen.getByTestId('pro-coming-soon')).toBeTruthy());
    expect(screen.queryByTestId('pro-buy')).toBeNull();
  });

  it('getProducts that never answers times out into coming soon', async () => {
    vi.useFakeTimers();
    try {
      plugin.getProducts.mockReturnValue(new Promise(() => {}));
      render(<ProUpgradeSheet />);
      await act(async () => { openProUpgrade('allThemes'); });
      await act(async () => { await vi.advanceTimersByTimeAsync(billing.PRODUCT_TIMEOUT_MS + 100); });
      expect(screen.getByTestId('pro-coming-soon')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('purchase success: toast, unlocks immediately, sheet closes', async () => {
    plugin.purchaseProduct.mockResolvedValue(owned());
    await open();
    await waitFor(() => expect((screen.getByTestId('pro-buy') as HTMLButtonElement).disabled).toBe(false));
    expect(hasFeature('allThemes')).toBe(false);
    await act(async () => { fireEvent.click(screen.getByTestId('pro-buy')); });
    await waitFor(() => expect(getProUpgradeState().open).toBe(false));
    expect(hasFeature('allThemes')).toBe(true);
    expect(toast.success).toHaveBeenCalled();
  });

  it('cancel: no error, sheet stays, still locked', async () => {
    plugin.purchaseProduct.mockRejectedValue({ code: 'USER_CANCELED', message: 'User canceled' });
    await open();
    await waitFor(() => expect((screen.getByTestId('pro-buy') as HTMLButtonElement).disabled).toBe(false));
    await act(async () => { fireEvent.click(screen.getByTestId('pro-buy')); });
    await waitFor(() => expect((screen.getByTestId('pro-buy') as HTMLButtonElement).disabled).toBe(false));
    expect(screen.queryByTestId('pro-message')).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
    expect(hasFeature('allThemes')).toBe(false);
  });

  it('PENDING: shows "Payment pending", stays locked', async () => {
    plugin.purchaseProduct.mockResolvedValue({ ...owned(), purchaseState: '0' });
    await open();
    await waitFor(() => expect((screen.getByTestId('pro-buy') as HTMLButtonElement).disabled).toBe(false));
    await act(async () => { fireEvent.click(screen.getByTestId('pro-buy')); });
    await waitFor(() => expect(screen.getByTestId('pro-message').textContent).toMatch(/^Payment pending/));
    expect(hasFeature('allThemes')).toBe(false);
  });

  it('restore: owned purchase unlocks and closes; none found shows a message', async () => {
    plugin.getPurchases.mockResolvedValue({ purchases: [] });
    await open();
    await waitFor(() => expect(screen.getByTestId('pro-buy')).toBeTruthy());
    await act(async () => { fireEvent.click(screen.getByTestId('pro-restore')); });
    await waitFor(() => expect(screen.getByTestId('pro-message').textContent).toMatch(/No previous purchase/));
    plugin.getPurchases.mockResolvedValue({ purchases: [owned()] });
    await act(async () => { fireEvent.click(screen.getByTestId('pro-restore')); });
    await waitFor(() => expect(getProUpgradeState().open).toBe(false));
    expect(hasFeature('maleVoice')).toBe(true);
  });

  it('plugin missing (import fails): never throws', async () => {
    plugin.getProducts.mockImplementation(() => { throw new Error('plugin not implemented'); });
    plugin.purchaseProduct.mockImplementation(() => { throw new Error('plugin not implemented'); });
    await open();
    await waitFor(() => expect(screen.getByTestId('pro-coming-soon')).toBeTruthy());
    closeProUpgrade();
  });
});
