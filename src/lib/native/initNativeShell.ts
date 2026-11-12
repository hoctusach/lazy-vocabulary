/**
 * Native-only chrome. No-ops on the web so the Vite build stays a normal site.
 * Auth is nickname + passcode stored in localStorage (the Supabase client sets
 * detectSessionInUrl: false), so there is no OAuth redirect to complete.
 * The custom scheme is still registered for a future redirect.
 */
export async function initNativeShell(): Promise<void> {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return;

  document.documentElement.classList.add('native-app');

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: '#1e3a8a' });
    await StatusBar.setStyle({ style: Style.Light });
  } catch (error) {
    console.warn('[native] status bar setup skipped', error);
  }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    /* splash plugin is optional at runtime */
  }

  try {
    const { App } = await import('@capacitor/app');
    await App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
        return;
      }
      void App.exitApp();
    });
    await App.addListener('appUrlOpen', ({ url }) => {
      console.info('[native] opened url', url);
    });
  } catch (error) {
    console.warn('[native] app plugin skipped', error);
  }
}
