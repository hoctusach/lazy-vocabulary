/**
 * AdMob configuration. IDs come from env (`VITE_ADMOB_APP_ID`, `VITE_ADMOB_BANNER_ID`,
 * set in .env.production or the shell) and fall back to Google's official TEST IDs.
 *
 * The Gradle build resolves the manifest app id separately (generateAdmobIds in
 * android/app/build.gradle): env ADMOB_APP_ID / -PadmobAppId, else VITE_ADMOB_APP_ID= in the
 * root .env.production / .env, else the test id. A release build with test IDs fails unless
 * ALLOW_TEST_ADS=true (or -PallowTestAds=true).
 */
const TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';

export const ADS_CONFIG = {
  appId: (import.meta.env.VITE_ADMOB_APP_ID as string | undefined) || TEST_APP_ID,
  bannerId: (import.meta.env.VITE_ADMOB_BANNER_ID as string | undefined) || TEST_BANNER_ID,
};

/** Substring shared by every Google sample/test AdMob ID. */
export const GOOGLE_TEST_ID_MARKER = '3940256099942544';
