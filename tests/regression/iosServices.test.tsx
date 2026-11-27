// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocked Capacitor platform = 'ios' (the real WKWebView / StoreKit / AVSpeech are proxy/manual: see the catalog).
const platform = vi.hoisted(() => ({ native: true, name: 'ios' }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => platform.native, getPlatform: () => platform.name },
  registerPlugin: () => ({ addListener: vi.fn(async () => ({ remove: vi.fn() })), start: vi.fn(), update: vi.fn(), stop: vi.fn(), setQueue: vi.fn(), requestNotificationPermission: vi.fn() }),
}));
const store = vi.hoisted(() => ({
  getPurchases: vi.fn(), getProducts: vi.fn(), purchaseProduct: vi.fn(), restorePurchases: vi.fn(), acknowledgePurchase: vi.fn(),
}));
vi.mock('@capgo/native-purchases', () => ({ NativePurchases: store, PURCHASE_TYPE: { INAPP: 'inapp', SUBS: 'subs' } }));

import * as ent from '@/services/billing/entitlement';
import * as billing from '@/services/billing/billingService';
import { isAdsSupported, needsTrackingPrompt } from '@/services/ads/adsPolicy';
import { ensureTrackingAuthorization } from '@/services/ads/tracking';
import { adsConfigFor, ADS_CONFIG, ADS_CONFIG_IOS } from '@/config/ads';
import { buildSpeakOptions, filterIosVoices, iosVoiceRank, pickVoiceIndex, type NativeVoice } from '@/services/speech/nativeTts';
import { isKokoroSupported } from '@/services/speech/kokoro/kokoroTts';
import {
  isBackgroundPlaybackSupported, isIosNowPlayingSupported, startPlaybackService, updatePlaybackService,
  stopPlaybackService, setPlaybackHandlers, isPlaybackServiceRunning, setPlaybackQueue, __resetPlaybackServiceForTests,
} from '@/services/background/playbackService';
import { buildSilentWavBytes, __isIosNowPlayingActiveForTests } from '@/services/background/iosNowPlaying';

const storeTx = (o: Record<string, unknown> = {}) => ({ productIdentifier: 'pro_unlock', transactionId: '2000000123456789', ...o });

beforeEach(() => {
  vi.clearAllMocks();
  platform.native = true; platform.name = 'ios';
  Object.values(store).forEach((f) => f.mockReset());
  store.restorePurchases.mockResolvedValue(undefined);
  store.getProducts.mockResolvedValue({ products: [{ identifier: 'pro_unlock', title: 'Pro', description: 'd', priceString: '$2.99', price: 2.99, currencyCode: 'USD' }] });
  ent.__resetEntitlementForTests();
  billing.__resetBillingForTests();
  localStorage.clear();
});

describe('[FB-68] iOS purchases: StoreKit 2 via @capgo/native-purchases', () => {
  it('[FB-68] billing is supported on iOS (and still on Android), not on web', () => {
    expect(billing.isBillingSupported()).toBe(true);
    platform.name = 'android'; expect(billing.isBillingSupported()).toBe(true);
    platform.native = false; platform.name = 'web'; expect(billing.isBillingSupported()).toBe(false);
  });

  it('[FB-68] launch: a StoreKit entitlement (no purchaseState on iOS) grants Pro and never calls acknowledge', async () => {
    store.getPurchases.mockResolvedValue({ purchases: [storeTx()] });
    await billing.initBilling();
    expect(ent.isProActive()).toBe(true);
    expect(store.acknowledgePurchase).not.toHaveBeenCalled();
    expect(ent.getProEntitlement()?.purchaseToken).toBe('2000000123456789');
  });

  it('[FB-68] launch: a revoked/refunded transaction does not grant Pro; no entitlement clears a stale cache', async () => {
    ent.setProEntitlement({ purchaseToken: 'old' });
    store.getPurchases.mockResolvedValue({ purchases: [storeTx({ revocationDate: '2026-01-01T00:00:00Z' })] });
    await billing.initBilling();
    expect(ent.isProActive()).toBe(false);
  });

  it('[FB-68] buy: purchaseProduct is a NON-consumable in-app purchase and unlocks Pro', async () => {
    store.purchaseProduct.mockResolvedValue(storeTx());
    expect(await billing.purchasePro()).toEqual({ status: 'purchased' });
    expect(store.purchaseProduct).toHaveBeenCalledWith(expect.objectContaining({ productIdentifier: 'pro_unlock', productType: 'inapp', isConsumable: false }));
    expect(ent.isProActive()).toBe(true);
    expect(store.acknowledgePurchase).not.toHaveBeenCalled();
  });

  it('[FB-68] buy: the user cancelling the Apple sheet is "cancelled", not an error', async () => {
    store.purchaseProduct.mockRejectedValue(Object.assign(new Error('User cancelled'), { code: 'USER_CANCELLED' }));
    expect((await billing.purchasePro()).status).toBe('cancelled');
    expect(ent.isProActive()).toBe(false);
  });

  it('[FB-68] Restore Purchases: calls restorePurchases (AppStore.sync), re-reads entitlements, grants Pro', async () => {
    store.getPurchases.mockResolvedValue({ purchases: [storeTx()] });
    expect(await billing.restorePro()).toEqual({ status: 'purchased' });
    expect(store.restorePurchases).toHaveBeenCalledTimes(1);
    expect(store.getPurchases).toHaveBeenCalled();
    expect(ent.isProActive()).toBe(true);
  });

  it('[FB-68] Restore Purchases with nothing to restore says Apple ID, not Google account', async () => {
    store.getPurchases.mockResolvedValue({ purchases: [] });
    const r = await billing.restorePro();
    expect(r.status).toBe('error');
    expect(r.message).toMatch(/Apple ID/);
    expect(r.message).not.toMatch(/Google/);
  });

  it('[FB-68] the localised App Store price is shown, never hard-coded', async () => {
    expect((await billing.getProProduct())?.priceString).toBe('$2.99');
  });

  it('[FB-68] Android keeps requiring purchaseState "1" (an iOS-style row without it does not grant on Android)', async () => {
    platform.name = 'android';
    store.getPurchases.mockResolvedValue({ purchases: [storeTx()] });
    await billing.initBilling();
    expect(ent.isProActive()).toBe(false);
  });
});

describe('[FB-68] iOS ads: AdMob test ids + ATT prompt before ads', () => {
  it('[FB-68] ads are supported on native iOS and Android only; ATT is needed on iOS only', () => {
    expect(isAdsSupported({ isNative: true, platform: 'ios' })).toBe(true);
    expect(isAdsSupported({ isNative: false, platform: 'ios' })).toBe(false);
    expect(needsTrackingPrompt({ isNative: true, platform: 'ios' })).toBe(true);
    expect(needsTrackingPrompt({ isNative: true, platform: 'android' })).toBe(false);
    expect(needsTrackingPrompt({ isNative: false, platform: 'web' })).toBe(false);
  });

  it('[FB-68] iOS defaults are Google iOS TEST ids, distinct from the Android ones', () => {
    expect(ADS_CONFIG_IOS.appId).toBe('ca-app-pub-3940256099942544~1458002511');
    expect(ADS_CONFIG_IOS.bannerId).toBe('ca-app-pub-3940256099942544/2934735716');
    expect(adsConfigFor('ios')).toBe(ADS_CONFIG_IOS);
    expect(adsConfigFor('android')).toBe(ADS_CONFIG);
    expect(adsConfigFor(null)).toBe(ADS_CONFIG);
  });

  it('[FB-68] notDetermined: the system ATT prompt is requested once, then the new status is returned', async () => {
    const statuses = ['notDetermined', 'authorized'] as const;
    let i = 0;
    const api = { trackingAuthorizationStatus: vi.fn(async () => ({ status: statuses[Math.min(i++, 1)] })), requestTrackingAuthorization: vi.fn(async () => undefined) };
    expect(await ensureTrackingAuthorization(api, 'ios')).toBe('authorized');
    expect(api.requestTrackingAuthorization).toHaveBeenCalledTimes(1);
  });

  it('[FB-68] already decided (denied/authorized/restricted): no second prompt; Android/web never prompt', async () => {
    const api = { trackingAuthorizationStatus: vi.fn(async () => ({ status: 'denied' as const })), requestTrackingAuthorization: vi.fn(async () => undefined) };
    expect(await ensureTrackingAuthorization(api, 'ios')).toBe('denied');
    expect(api.requestTrackingAuthorization).not.toHaveBeenCalled();
    expect(await ensureTrackingAuthorization(api, 'android')).toBe('skipped');
    expect(await ensureTrackingAuthorization(api, null)).toBe('skipped');
    expect(api.trackingAuthorizationStatus).toHaveBeenCalledTimes(1);
  });

  it('[FB-68] a throwing ATT plugin never blocks ads', async () => {
    const api = { trackingAuthorizationStatus: vi.fn(async () => { throw new Error('boom'); }), requestTrackingAuthorization: vi.fn() };
    await expect(ensureTrackingAuthorization(api, 'ios')).resolves.toBe('notDetermined');
  });

  it('[FB-68] adsService requests ATT after UMP consent and BEFORE AdMob.initialize()', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/services/ads/adsService.ts', 'utf8');
    const consent = src.indexOf('showConsentForm()');
    const att = src.indexOf('ensureTrackingAuthorization(');
    const init = src.indexOf('AdMob.initialize()');
    expect(consent).toBeGreaterThan(0);
    expect(att).toBeGreaterThan(consent);
    expect(init).toBeGreaterThan(att);
    expect(src).toContain('adsConfigFor(nativePlatform())');
  });
});

describe('[FB-68] iOS TTS voice selection (AVSpeechSynthesizer)', () => {
  const v = (name: string, lang: string, id: string): NativeVoice => ({ name, lang, voiceURI: id, localService: true, default: false });
  const voices = [
    v('Bells', 'en-US', 'com.apple.speech.synthesis.voice.Bells'),
    v('Samantha', 'en-US', 'com.apple.voice.compact.en-US.Samantha'),
    v('Zoe (Premium)', 'en-US', 'com.apple.voice.premium.en-US.Zoe'),
    v('Evan (Enhanced)', 'en-US', 'com.apple.voice.enhanced.en-US.Evan'),
    v('Daniel', 'en-GB', 'com.apple.voice.compact.en-GB.Daniel'),
    v('Linh', 'vi-VN', 'com.apple.voice.compact.vi-VN.Linh'),
  ];

  it('[FB-68] quality ranks premium > enhanced > compact, novelty voices are excluded', () => {
    expect(iosVoiceRank(voices[2])).toBeGreaterThan(iosVoiceRank(voices[3]));
    expect(iosVoiceRank(voices[3])).toBeGreaterThan(iosVoiceRank(voices[1]));
    expect(iosVoiceRank(voices[0])).toBe(-1);
    expect(filterIosVoices(voices).map((x) => x.name)).not.toContain('Bells');
  });

  it('[FB-68] with no saved voice, the best voice of the language is picked on iOS (and never Bells)', () => {
    expect(voices[pickVoiceIndex(voices, 'en-US', undefined, 'ios')!].name).toBe('Zoe (Premium)');
    expect(voices[pickVoiceIndex(voices, 'en-GB', undefined, 'ios')!].name).toBe('Daniel');
    expect(voices[pickVoiceIndex(voices, 'vi', undefined, 'ios')!].name).toBe('Linh'); // primary-language fallback
  });

  it('[FB-68] a saved voice (by name or voiceURI) always wins over the ranking (FB-61 persistence)', () => {
    expect(voices[pickVoiceIndex(voices, 'en-US', 'Samantha', 'ios')!].name).toBe('Samantha');
    expect(voices[pickVoiceIndex(voices, 'en-US', 'com.apple.voice.compact.en-US.Samantha', 'ios')!].name).toBe('Samantha');
  });

  it('[FB-68] Android order-based pick is unchanged (first match)', () => {
    expect(pickVoiceIndex(voices, 'en-US', undefined, 'android')).toBe(0);
  });

  it('[FB-68] speak options use the playback audio session on iOS only (plays with screen locked / silent switch)', () => {
    expect(buildSpeakOptions({ text: 'run', lang: 'en-US', rate: 0.9 }, 2, 'ios')).toMatchObject({ text: 'run', voice: 2, category: 'playback' });
    expect(buildSpeakOptions({ text: 'run' }, 2, 'android').category).toBeUndefined();
    expect(buildSpeakOptions({ text: 'run' }, undefined, null).category).toBeUndefined();
  });

  it('[FB-68] Kokoro (Android ONNX plugin) is not offered on iOS; system voices are used instead', () => {
    expect(isKokoroSupported()).toBe(false);
    platform.name = 'android';
    expect(isKokoroSupported()).toBe(true);
  });
});

describe('[FB-68] iOS background playback / Now Playing fallback', () => {
  const info = { title: 'bring back something', text: 'to return with something', playing: true };
  const ms = { metadata: null as unknown, playbackState: 'none', setActionHandler: vi.fn() };
  let play: ReturnType<typeof vi.fn>; let pause: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    __resetPlaybackServiceForTests();
    ms.metadata = null; ms.playbackState = 'none'; ms.setActionHandler.mockReset();
    Object.defineProperty(navigator, 'mediaSession', { value: ms, configurable: true });
    (globalThis as { MediaMetadata?: unknown }).MediaMetadata = class { constructor(public o: unknown) {} };
    URL.createObjectURL = vi.fn(() => 'blob:silent'); URL.revokeObjectURL = vi.fn();
    play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined) as never;
    pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined) as never;
  });

  it('[FB-68] iOS uses the Now Playing path; the Android foreground service is not used', () => {
    expect(isIosNowPlayingSupported()).toBe(true);
    expect(isBackgroundPlaybackSupported()).toBe(false);
    platform.name = 'android';
    expect(isIosNowPlayingSupported()).toBe(false);
    expect(isBackgroundPlaybackSupported()).toBe(true);
  });

  it('[FB-68] start: silent loop plays and the word is published to Media Session (lock screen / Control Center)', async () => {
    await startPlaybackService(info);
    expect(isPlaybackServiceRunning()).toBe(true);
    expect(play).toHaveBeenCalled();
    expect(ms.playbackState).toBe('playing');
    expect((ms.metadata as { o: { title: string; artist: string } }).o).toMatchObject({ title: 'bring back something', artist: 'to return with something' });
  });

  it('[FB-68] lock-screen Play / Pause / Next reach the same handlers as the in-app buttons', async () => {
    const h = { onPlay: vi.fn(), onPause: vi.fn(), onNext: vi.fn() };
    setPlaybackHandlers(h);
    await startPlaybackService(info);
    const reg = Object.fromEntries(ms.setActionHandler.mock.calls.map(([a, f]) => [a, f as () => void]));
    reg.play(); reg.pause(); reg.nexttrack();
    expect(h.onPlay).toHaveBeenCalledTimes(1);
    expect(h.onPause).toHaveBeenCalledTimes(1);
    expect(h.onNext).toHaveBeenCalledTimes(1);
  });

  it('[FB-68] paused keeps the card (state paused, loop paused); playing again resumes; stop releases everything', async () => {
    await startPlaybackService(info);
    pause.mockClear(); play.mockClear();
    await updatePlaybackService({ ...info, playing: false });
    expect(ms.playbackState).toBe('paused');
    expect(pause).toHaveBeenCalled();
    await updatePlaybackService({ ...info, playing: true });
    expect(play).toHaveBeenCalled();
    await stopPlaybackService();
    expect(isPlaybackServiceRunning()).toBe(false);
    expect(__isIosNowPlayingActiveForTests()).toBe(false);
    expect(ms.playbackState).toBe('none');
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('[FB-68] the native queue is an Android-only feature: setPlaybackQueue is a no-op on iOS', async () => {
    await expect(setPlaybackQueue({ items: [{ word: 'a' }], index: 0, engine: 'system' })).resolves.toBeUndefined();
  });

  it('[FB-68] web / PWA never starts a silent loop', async () => {
    platform.native = false; platform.name = 'web';
    await startPlaybackService(info);
    expect(play).not.toHaveBeenCalled();
    expect(isPlaybackServiceRunning()).toBe(false);
  });

  it('[FB-68] the generated silence is a valid WAV (RIFF/WAVE, PCM 8-bit mono, 0x80 samples)', () => {
    const b = buildSilentWavBytes(1, 8000);
    const dv = new DataView(b.buffer);
    expect(String.fromCharCode(...b.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...b.slice(8, 12))).toBe('WAVE');
    expect(dv.getUint16(20, true)).toBe(1); // PCM
    expect(dv.getUint16(22, true)).toBe(1); // mono
    expect(dv.getUint32(40, true)).toBe(8000);
    expect(b.length).toBe(44 + 8000);
    expect(new Set(b.slice(44))).toEqual(new Set([128]));
  });
});
