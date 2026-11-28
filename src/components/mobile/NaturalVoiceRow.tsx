import React, { useEffect, useState, useSyncExternalStore } from 'react';
import {
  cancelKokoroDownload,
  deleteKokoro,
  getKokoroState,
  isKokoroSupported,
  refreshKokoroStatus,
  subscribeKokoro,
} from '@/services/speech/kokoro/kokoroTts';
import { onUserDeletedModel, userStartDownload } from '@/services/speech/kokoro/kokoroAutoDownload';
import { KOKORO_DOWNLOAD_BYTES } from '@/services/speech/kokoro/kokoroVoices';

const mb = (bytes: number) => Math.round(bytes / 1_000_000);

/** One compact line in More: "Natural voice: Ready · 333 MB — Delete / Re-download". Android + iOS (native Kokoro plugin). */
const NaturalVoiceRow: React.FC = () => {
  if (!isKokoroSupported()) return null;
  return <NaturalVoiceRowInner />;
};

const NaturalVoiceRowInner: React.FC = () => {
  const state = useSyncExternalStore(subscribeKokoro, getKokoroState);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { void refreshKokoroStatus(); }, []);

  const size = mb(state.totalBytes || KOKORO_DOWNLOAD_BYTES);
  const pct = state.totalBytes > 0 ? Math.min(100, Math.round((state.downloadedBytes / state.totalBytes) * 100)) : 0;
  const link = 'underline font-medium';
  const remove = async () => {
    setConfirmDelete(false);
    await deleteKokoro();
    onUserDeletedModel();
  };

  let status: React.ReactNode;
  if (state.downloading) {
    status = (
      <>
        <span>{`Downloading ${pct}%`}</span>{' — '}
        <button type="button" className={link} onClick={() => void cancelKokoroDownload()}>Cancel</button>
      </>
    );
  } else if (state.downloaded) {
    status = confirmDelete ? (
      <>
        <span>Delete the natural voice?</span>{' '}
        <button type="button" className={link} onClick={() => void remove()}>Delete</button>{' / '}
        <button type="button" className={link} onClick={() => setConfirmDelete(false)}>Keep</button>
      </>
    ) : (
      <>
        <span>{`Ready · ${size} MB`}</span>{' — '}
        {state.upgradeAvailable && (<><button type="button" className={link} onClick={userStartDownload}>Upgrade</button>{' / '}</>)}
        <button type="button" className={link} onClick={() => setConfirmDelete(true)}>Delete</button>{' / '}
        <button type="button" className={link} onClick={userStartDownload}>Re-download</button>
      </>
    );
  } else {
    status = (
      <>
        <span>{state.error ? 'Download failed' : 'Not downloaded'}</span>{' — '}
        <button type="button" className={link} onClick={userStartDownload}>{state.error ? 'Retry' : 'Download'}</button>
      </>
    );
  }

  return (
    <p className="px-1 text-sm" style={{ color: 'var(--lv-text-secondary)' }} data-section="natural-voice">
      Natural voice: {status}
    </p>
  );
};

export default NaturalVoiceRow;
