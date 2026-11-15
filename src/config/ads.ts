/**
 * AdMob configuration — the ONE place to change ad IDs.
 *
 * Both values below are Google's official TEST IDs. They are safe for debug
 * builds and development, but a release build (`bundleRelease` / `assembleRelease`)
 * FAILS while this file still contains `3940256099942544`
 * (see `preReleaseBuild` guard in android/app/build.gradle).
 *
 * Before publishing to Google Play:
 *   1. AdMob console → Apps → Lazy Vocabulary (Android) → copy the App ID
 *      (looks like `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`) into `appId`.
 *   2. AdMob console → Ad units → Banner → copy the Ad unit ID
 *      (looks like `ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`) into `bannerId`.
 *
 * The Gradle build reads `appId` from this file (generateAdmobIds task) and
 * writes the AndroidManifest APPLICATION_ID value, so there is no second copy.
 * Keep the `appId: '...'` literal format on a single line — Gradle parses it
 * with a regex.
 */
export const ADS_CONFIG = {
  appId: 'ca-app-pub-3940256099942544~3347511713',
  bannerId: 'ca-app-pub-3940256099942544/6300978111',
} as const;

/** Substring shared by every Google sample/test AdMob ID. */
export const GOOGLE_TEST_ID_MARKER = '3940256099942544';
