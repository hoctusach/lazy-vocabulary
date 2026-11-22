import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { App as CapApp } from '@capacitor/app';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getKokoroState, isKokoroSupported, subscribeKokoro } from '@/services/speech/kokoro/kokoroTts';
import {
  answerMeteredPrompt,
  applyDefaultVoiceIfReady,
  getMeteredPromptVisible,
  runAutoDownloadCheck,
  subscribeAutoDownloadUi,
} from '@/services/speech/kokoro/kokoroAutoDownload';
import { KOKORO_DOWNLOAD_BYTES } from '@/services/speech/kokoro/kokoroVoices';

const mb = (bytes: number) => Math.round(bytes / 1_000_000);

/**
 * Mounted once at the app root. Fetches the natural voice in the background (see kokoroAutoDownload.ts),
 * shows a small progress pill while it downloads and makes Kokoro Heart the default voice when it is ready.
 */
const KokoroAutoDownload: React.FC = () => {
  if (!isKokoroSupported()) return null;
  return <KokoroAutoDownloadInner />;
};

const KokoroAutoDownloadInner: React.FC = () => {
  const state = useSyncExternalStore(subscribeKokoro, getKokoroState);
  const promptVisible = useSyncExternalStore(subscribeAutoDownloadUi, getMeteredPromptVisible);
  const [minimised, setMinimised] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const wasDownloading = useRef(false);
  const wasDownloaded = useRef<boolean | null>(null);

  // start + every resume
  useEffect(() => {
    const safeCheck = () => { try { void Promise.resolve(runAutoDownloadCheck()).catch(() => {}); } catch { /* ignore */ } };
    safeCheck();
    let handle: { remove: () => Promise<void> } | null = null;
    let disposed = false;
    Promise.resolve().then(() => CapApp.addListener('resume', safeCheck))
      .then((h) => { if (disposed) void h.remove(); else handle = h; })
      .catch(() => {});
    return () => { disposed = true; void handle?.remove(); };
  }, []);

  // downloaded transitions: pick Heart as the default (announce only after a fresh download)
  useEffect(() => {
    const prev = wasDownloaded.current;
    wasDownloaded.current = state.downloaded;
    if (!state.downloaded) return;
    if (prev === null) applyDefaultVoiceIfReady(false); // already installed at launch
    else if (prev === false) applyDefaultVoiceIfReady(true);
  }, [state.downloaded]);

  // a new download run re-shows the pill
  useEffect(() => {
    if (state.downloading && !wasDownloading.current) { setDismissed(false); setMinimised(false); }
    wasDownloading.current = state.downloading;
  }, [state.downloading]);

  const pct = state.totalBytes > 0 ? Math.min(100, Math.round((state.downloadedBytes / state.totalBytes) * 100)) : 0;
  const size = mb(state.totalBytes || KOKORO_DOWNLOAD_BYTES);

  return (
    <>
      {state.downloading && !dismissed && (
        <div
          className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-3"
          style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
          data-kokoro-download-pill
        >
          <div
            className="pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-1 text-xs shadow theme-card-surface"
            style={{ borderColor: 'var(--lv-border-color)', color: 'var(--lv-text-secondary)' }}
            role="status"
          >
            <span>{minimised ? `${pct}%` : `Downloading natural voice… ${pct}%`}</span>
            <button type="button" aria-label={minimised ? 'Expand download status' : 'Minimise download status'} className="px-1" onClick={() => setMinimised((m) => !m)}>
              {minimised ? '▴' : '▾'}
            </button>
            <button type="button" aria-label="Hide download status" className="px-1" onClick={() => setDismissed(true)}>✕</button>
          </div>
        </div>
      )}
      <AlertDialog open={promptVisible} onOpenChange={(o) => { if (!o && getMeteredPromptVisible()) answerMeteredPrompt('later'); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Natural voice</AlertDialogTitle>
            <AlertDialogDescription>
              {`Download the natural voice (≈${size} MB) now? You're on mobile data.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => answerMeteredPrompt('later')}>Later — on Wi-Fi</AlertDialogCancel>
            <AlertDialogAction onClick={() => answerMeteredPrompt('now')}>Download now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default KokoroAutoDownload;
