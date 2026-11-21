// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
}));
vi.mock('@capgo/native-purchases', () => ({
  NativePurchases: { getPurchases: vi.fn(), getProducts: vi.fn().mockResolvedValue({ products: [] }) },
  PURCHASE_TYPE: { INAPP: 'inapp' },
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/components/UserGreeting', () => ({ default: () => null }));
vi.mock('@/components/ThemeSwitcher', () => ({ default: () => null }));
vi.mock('@/components/NotificationManager', () => ({ default: () => null }));
vi.mock('@/components/mobile/ProCard', () => ({ default: () => <div data-testid="pro-card" /> }));
vi.mock('@/services/speech/nativeTts', () => ({ isNativePlatform: () => true }));

import { setProEntitlement, __resetEntitlementForTests } from '../entitlement';
import { adsAllowed } from '@/hooks/useAdsVisibility';
import { isProEnabled } from '@/config/features';
import MorePanel from '@/components/mobile/MorePanel';

beforeEach(() => __resetEntitlementForTests());
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe('VITE_ENABLE_PRO flag', () => {
  it('defaults to off', () => {
    vi.stubEnv('VITE_ENABLE_PRO', '');
    expect(isProEnabled()).toBe(false);
  });

  it('off: no ProCard, cached entitlement ignored by ads', () => {
    vi.stubEnv('VITE_ENABLE_PRO', 'false');
    setProEntitlement({});
    expect(adsAllowed()).toBe(true);
    render(<MorePanel />);
    expect(screen.queryByTestId('pro-card')).toBeNull();
  });

  it('on: ProCard rendered, cached entitlement disables ads', () => {
    vi.stubEnv('VITE_ENABLE_PRO', 'true');
    expect(adsAllowed()).toBe(true);
    setProEntitlement({});
    expect(adsAllowed()).toBe(false);
    render(<MorePanel />);
    expect(screen.getByTestId('pro-card')).toBeTruthy();
  });
});
