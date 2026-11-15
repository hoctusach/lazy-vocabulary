import { Capacitor } from '@capacitor/core';

/**
 * Nickname/passcode auth does not use Supabase OAuth redirects
 * (`detectSessionInUrl` is false; the session lives in localStorage, which the
 * WebView provides). This listener only forwards a custom-scheme deep link
 * into the existing BrowserRouter history.
 */
function pathFromAppUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return `${url.pathname}${url.search}${url.hash}` || null;
    }
    const host = url.hostname;
    const path = url.pathname === '/' ? '' : url.pathname;
    const combined = `/${host}${path}`.replace(/\/{2,}/g, '/');
    if (!combined || combined === '/') return null;
    return `${combined}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export async function initNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#1e40af' });
  } catch (error) {
    console.warn('[native] status bar', error);
  }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch (error) {
    console.warn('[native] splash', error);
  }

  try {
    const { App } = await import('@capacitor/app');
    await App.addListener('appUrlOpen', (event) => {
      const path = pathFromAppUrl(event.url);
      if (!path || typeof window === 'undefined') return;
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  } catch (error) {
    console.warn('[native] app url', error);
  }
}

export { pathFromAppUrl };
