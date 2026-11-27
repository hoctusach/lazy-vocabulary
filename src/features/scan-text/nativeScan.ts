import { Capacitor } from '@capacitor/core';
import { registerPlatformScanAdapter, ScanError, type ScanAdapter } from './ocr';
import { registerPlatformTranslationAdapter, type TranslationAdapter } from './translation';
import type { OcrScriptId } from './languages';

/**
 * [FB-66] The ONLY place that knows about Capacitor / ML Kit. Android and iOS share these plugins (same JS API), so adding iOS
 * needs no change here or in shared code. Plugins are imported lazily so web bundles never load them.
 */
const MLKIT_SCRIPT: Record<OcrScriptId, string> = {
  latin: 'LATIN',
  chinese: 'CHINESE',
  devanagari: 'DEVANAGARI',
  japanese: 'JAPANESE',
  korean: 'KOREAN',
};

/** Script packs compiled into the native app. Add an id here when its ML Kit pack is re-enabled in android/app/build.gradle. */
export const INSTALLED_SCRIPTS: readonly OcrScriptId[] = ['latin'];

const isCancel = (e: unknown) => /cancel/i.test(String((e as { message?: string })?.message ?? e));

const nativeScan: ScanAdapter = {
  isAvailable: async () => true,
  async pickImage(source) {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    try {
      const photo = await Camera.getPhoto({
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        resultType: CameraResultType.Uri,
        quality: 90,
        saveToGallery: false, // we never write to the user's photo library
        correctOrientation: true,
      });
      const path = photo.path ?? photo.webPath;
      if (!path) throw new ScanError('failed', 'Could not open that photo.');
      return { path };
    } catch (e) {
      if (isCancel(e)) return null;
      if (e instanceof ScanError) throw e;
      throw new ScanError('failed', 'Could not open the camera or photo.');
    }
  },
  async recognize(image, script) {
    if (!INSTALLED_SCRIPTS.includes(script)) throw new ScanError('unavailable', 'This language is not supported for scanning yet.');
    const { TextRecognition, Script } = await import('@capacitor-mlkit/text-recognition');
    try {
      const r = await TextRecognition.processImage({ path: image.path, script: MLKIT_SCRIPT[script] as unknown as typeof Script.Latin });
      return { text: r.text ?? '' };
    } catch {
      throw new ScanError('failed', 'Could not read text from that image.');
    }
  },
};

const nativeTranslation: TranslationAdapter = {
  isAvailable: async () => true,
  async isModelDownloaded(language) {
    const { Translation } = await import('@capacitor-mlkit/translation');
    const { languages } = await Translation.getDownloadedModels();
    return (languages as string[]).includes(language);
  },
  async downloadModel(language) {
    const { Translation } = await import('@capacitor-mlkit/translation');
    await Translation.downloadModel({ language: language as never });
  },
  async translate(text, from, to) {
    const { Translation } = await import('@capacitor-mlkit/translation');
    const r = await Translation.translate({ text, sourceLanguage: from as never, targetLanguage: to as never });
    return r.text;
  },
};

registerPlatformScanAdapter(async () => (Capacitor.isNativePlatform() ? nativeScan : null));
registerPlatformTranslationAdapter(async () => (Capacitor.isNativePlatform() ? nativeTranslation : null));
