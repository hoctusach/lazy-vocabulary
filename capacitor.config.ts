import type { CapacitorConfig } from '@capacitor/cli';

/**
 * `docs/` is the live GitHub Pages website and must NEVER be Capacitor's webDir
 * (1.0.2 shipped a stale website bundle that way: blank white screen). The app is
 * built into the gitignored `capacitor-www/` by `npm run build:mobile`, and
 * `npx cap sync` copies that folder into the native projects.
 * Android uses https://localhost; iOS uses the capacitor scheme. Both serve
 * index.html for client-side routes, so the app keeps BrowserRouter.
 */
const config: CapacitorConfig = {
  appId: 'com.hoctusach.lazyvocabulary',
  appName: 'Lazy Vocabulary',
  webDir: 'capacitor-www',
  server: {
    androidScheme: 'https',
    hostname: 'lazyvocabulary.local',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      // Keep the splash until the app has rendered; initNativeShell() hides it
      // after React mounts, so users never see an empty white WebView.
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: '#1a5488',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'LIGHT',
      backgroundColor: '#1e40af',
    },
  },
};

export default config;
