import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The Vite production build writes to `docs` (GitHub Pages). Capacitor copies
 * that folder into the native projects during `cap sync`.
 * Android serves the app from https://localhost, so the History API can work,
 * but the native shell still uses HashRouter (see src/App.tsx) so reloads and
 * custom-scheme links do not depend on the WebView rewrite rules.
 */
const config: CapacitorConfig = {
  appId: 'com.lazy.vocabulary',
  appName: 'Lazy Vocabulary',
  webDir: 'docs',
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#1e3a8a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#1e3a8a',
      overlaysWebView: false,
    },
  },
};

export default config;
