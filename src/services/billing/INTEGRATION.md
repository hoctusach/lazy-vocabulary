# Pro (`pro_unlock`) ↔ Ads integration

Branch `fix/android-blank-screen` adds a one-time non-consumable `pro_unlock` (Google Play, INAPP).
Ads must be suppressed whenever the user owns Pro. Ad code is NOT in this branch; the ads branch
(`feat/play-store-ads-release`) consumes these three exports from `src/hooks/useAdsVisibility.ts`:

| Export | Use |
|---|---|
| `useAdsAllowed(): boolean` | React hook (re-renders on purchase/restore/refund) |
| `adsAllowed(): boolean` | Non-React, `= !isProActive()` |
| `onAdsAllowedChange(cb): () => void` | Subscribe (`cb(allowed)`); returns unsubscribe |

## useBannerAds.ts
```ts
const allowed = useAdsAllowed();
const show = allowed && shouldShowBannerForTab(tab);
useEffect(() => { void setBannerWanted(show); }, [show]);
```

## adsService.ts
- In init: `if (!adsAllowed()) return;` (skip SDK init / consent for Pro users). Because `initBilling()`
  resolves asynchronously, the cached entitlement (localStorage `lazyVoca.pro.v1`) is read synchronously
  and is correct on launch for returning Pro users.
- Every show path (banner, interstitial, etc.): guard with `adsAllowed()`.
- Subscribe once so ads vanish immediately after purchase:
  ```ts
  onAdsAllowedChange((allowed) => { if (!allowed) { setBannerWanted(false); hideBanner/removeBanner(); } else { /* optional: re-init */ } });
  ```
- If ads are initialised lazily and Pro is granted later, also destroy the banner (not just hide) to free the view.

## Billing behaviour to know
- Entitlement only cleared when `getPurchases` succeeds and lacks `pro_unlock` (refund/other account); network failure keeps cache.
- PENDING purchases (`purchaseState "0"`) are never granted; granted once `"1"` appears on a later `initBilling()` / "Restore purchase".
- Plugin: `@capgo/native-purchases` 8.9.16. `purchaseProduct` is called with `isConsumable:false`, `autoAcknowledgePurchases:true`;
  `initBilling` additionally calls `acknowledgePurchase` for any purchased-but-unacknowledged `pro_unlock` (3-day window).
- Play Console: create INAPP product id `pro_unlock`, set price (49,000 VND / 2.99 USD), activate. App must be uploaded to a testing track for billing to work; test with a licence-tester account.

## Merge order / conflicts
1. Merge this branch (billing) first, then the ads branch (or vice versa; the integration is only the three imports above).
2. Likely conflict files:
   - `src/components/mobile/MorePanel.tsx` – this branch adds `<ProCard />` (gated by `isBillingSupported()`); ads branch adds account/privacy links under `UserGreeting`. Keep both.
   - `android/app/src/main/AndroidManifest.xml` – this adds `com.android.vending.BILLING`; ads branch adds `AD_ID` permission and AdMob `<meta-data>`. Keep both.
   - `package.json` / `package-lock.json` – both add a dependency; resolve package.json by hand, then `npm install` to regenerate the lock.
   - `src/App.tsx` – this adds `initBilling()` next to `initNativeShell()`; ads init may land nearby.
3. After merging: `npx cap sync android` (registers the plugin in capacitor.settings.gradle / capacitor.build.gradle) then build.
