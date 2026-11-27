/**
 * [FB-68] iOS App Tracking Transparency (ATT). Called from the ads service after UMP consent and BEFORE
 * AdMob.initialize(), so the system prompt appears before any ad request. Whatever the user answers, ads
 * still load (non-personalized when denied). No-op on Android/web.
 */
export interface TrackingApi {
  trackingAuthorizationStatus(): Promise<{ status: 'authorized' | 'denied' | 'notDetermined' | 'restricted' }>;
  requestTrackingAuthorization(): Promise<void>;
}

export type TrackingResult = 'authorized' | 'denied' | 'notDetermined' | 'restricted' | 'skipped';

export async function ensureTrackingAuthorization(api: TrackingApi, platform: string | null | undefined): Promise<TrackingResult> {
  if (platform !== 'ios') return 'skipped';
  try {
    const { status } = await api.trackingAuthorizationStatus();
    if (status !== 'notDetermined') return status;
    await api.requestTrackingAuthorization();
    return (await api.trackingAuthorizationStatus()).status;
  } catch (e) {
    console.warn('[ads] ATT', e);
    return 'notDetermined';
  }
}
