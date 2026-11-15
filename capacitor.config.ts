import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The Vite production build writes to `docs` (also used for GitHub Pages).
 * Capacitor copies that folder into the native projects on `npx cap sync`.
 * Android uses https://localhost; iOS uses the capacitor scheme. Both serve
 * index.html for client-side routes, so the app keeps BrowserRouter.
 */
const config: CapacitorConfig = {
  appId: 'com.lazy.vocabulary',
  appName: 'Lazy Vocabulary',
  webDir: 'docs',
  server: {
    androidScheme: 'https',
    hostname: 'lazyvocabulary.local',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: true,
      backgroundColor: '#1e40af',
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
