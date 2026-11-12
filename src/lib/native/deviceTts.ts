/**
 * Web Speech API works in desktop browsers and the Android WebView.
 * iOS WKWebView often exposes `speechSynthesis` but never speaks, and some
 * WebViews omit it entirely. Those cases use the native TTS plugin.
 */

type NativeBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function nativeBridge(): NativeBridge | null {
  if (typeof window === 'undefined') return null;
  const bridge = (window as Window & { Capacitor?: NativeBridge }).Capacitor;
  return bridge ?? null;
}

export async function shouldPreferNativeTts(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const bridge = nativeBridge();
  const iosApp = Boolean(bridge?.isNativePlatform?.() && bridge.getPlatform?.() === 'ios');
  if (iosApp) return true;
  return typeof window.speechSynthesis === 'undefined';
}

export async function speakWithDeviceTts(
  text: string,
  options?: { rate?: number; muted?: boolean }
): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (options?.muted) return true;

  try {
    const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
    await TextToSpeech.speak({
      text: trimmed,
      lang: 'en-US',
      rate: options?.rate ?? 1,
      pitch: 1,
      volume: 1,
      category: 'ambient',
    });
    return true;
  } catch (error) {
    console.warn('[TTS] Device speech unavailable', error);
    return false;
  }
}

export async function stopDeviceTts(): Promise<void> {
  try {
    const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
    await TextToSpeech.stop();
  } catch {
    /* plugin unavailable on web */
  }
}
