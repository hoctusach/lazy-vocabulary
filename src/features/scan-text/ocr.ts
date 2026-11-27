import type { OcrScriptId } from './languages';

/**
 * [FB-66] The OCR seam. Shared code only ever talks to a `ScanAdapter`; the platform (ML Kit on Android today, ML Kit on iOS
 * later, a mock in web/e2e) lives behind it. The script is a parameter so Japanese / Korean / Chinese / Devanagari are
 * added by passing a different `OcrScriptId`, not by changing call sites.
 */
export interface ImageRef {
  /** Opaque to shared code: a local file path / URI the adapter's own recognizer understands. */
  path: string;
}

export type ImageSource = 'camera' | 'gallery';

export class ScanError extends Error {
  constructor(public code: 'unavailable' | 'failed', message: string) {
    super(message);
    this.name = 'ScanError';
  }
}

export interface ScanAdapter {
  /** False when there is no camera / OCR (web). The UI then shows a clear message. */
  isAvailable(): Promise<boolean>;
  /** Take a photo or pick one. Resolves null when the user cancels (never counts as a scan). */
  pickImage(source: ImageSource): Promise<ImageRef | null>;
  /** On-device text recognition for one script. */
  recognize(image: ImageRef, script: OcrScriptId): Promise<{ text: string }>;
}

declare global {
  interface Window {
    /** Test hook: a mock ScanAdapter (e2e / web preview) used instead of the platform one. */
    __LV_SCAN_ADAPTER__?: ScanAdapter;
  }
}

const unavailable: ScanAdapter = {
  isAvailable: async () => false,
  pickImage: async () => { throw new ScanError('unavailable', 'Scanning text needs the mobile app.'); },
  recognize: async () => { throw new ScanError('unavailable', 'Scanning text needs the mobile app.'); },
};

let platformFactory: (() => Promise<ScanAdapter | null>) | null = null;
/** Registered once by the platform module (nativeScan.ts). */
export function registerPlatformScanAdapter(factory: () => Promise<ScanAdapter | null>): void {
  platformFactory = factory;
}

export async function getScanAdapter(): Promise<ScanAdapter> {
  if (typeof window !== 'undefined' && window.__LV_SCAN_ADAPTER__) return window.__LV_SCAN_ADAPTER__;
  return (await platformFactory?.()) ?? unavailable;
}
