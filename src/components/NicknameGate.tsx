'use client';
import { useEffect, useState } from 'react';
import { getNicknameLocal, validateDisplayName, NICKNAME_LS_KEY } from '../lib/nickname';
import { sanitizeDisplay, normalizeNickname, getNicknameByKey, upsertNickname } from '@/services/nicknameService';
import { ensureUserKey } from '@/lib/progress/srsSyncByUserKey';

type UIState = {
  ready: boolean;    // localStorage checked
  show: boolean;     // show modal?
  value: string;
  pending: boolean;
  error?: string;
};

export default function NicknameGate() {
  const [s, setS] = useState<UIState>({ ready: false, show: false, value: '', pending: false });

  // On first client render, decide whether to show the modal
  useEffect(() => {
    const existing = getNicknameLocal();
    setS(prev => ({ ...prev, ready: true, show: !existing, value: '' }));

    // If user sets nickname in another tab, close here too
    function onStorage(e: StorageEvent) {
      if (e.key === NICKNAME_LS_KEY && e.newValue) setS(p => ({ ...p, show: false }));
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!s.ready || !s.show) return null; // no flicker before we know

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nick = s.value.trim();
    const errMsg = validateDisplayName(nick);
    if (errMsg) { setS(p => ({ ...p, pending: false, error: errMsg })); return; }

    setS(p => ({ ...p, pending: true, error: undefined }));
    const display = sanitizeDisplay(nick);
    const key = normalizeNickname(display);

    try {
      const existing = await getNicknameByKey(key);
      const chosen = existing ?? await upsertNickname(display);

      localStorage.setItem(NICKNAME_LS_KEY, chosen.name);
      void ensureUserKey().catch(() => {});
      try {
        const mod = await import('../lib/sync/autoBackfillOnReload');
        void mod.autoBackfillOnReload();
      } catch {}
      try { (await import('../lib/storage/migrateLocalVocabToDb')).migrateLocalVocabToDb?.(); } catch {}

      setS({ ready: true, show: false, value: chosen.name, pending: false });
    } catch (err: any) {
      setS(p => ({ ...p, pending: false, error: err.message || 'Failed to save nickname' }));
    }
  };

  const BLOCKED_CHARS_HELP = "< > \" ' ` $ \\ { } | ;";

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <form onSubmit={onSubmit} style={{ width: 360, padding: 20, borderRadius: 12, background: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', fontFamily: 'system-ui, sans-serif' }}>
        <h3 style={{ margin: 0 }}>Choose your nickname</h3>
        <p style={{ marginTop: 6, color: '#555', fontSize: 14 }}>
          To sync your learning across devices, please set a nickname. We’ll use it to save your progress.
        </p>
        <input
          autoFocus
          value={s.value}
          onChange={(e) => setS(p => ({ ...p, value: e.target.value, error: undefined }))}
          placeholder="e.g., Mi mi U"
          maxLength={40}
          disabled={s.pending}
          style={{ width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <div style={{ marginTop: 4, fontSize: 12, color: '#777' }}>
          Names are matched case-insensitively and ignore spaces. Allowed: most characters; blocked: {BLOCKED_CHARS_HELP}
        </div>
        {s.error && <div style={{ color: '#c00', marginTop: 8, fontSize: 13 }}>{s.error}</div>}
        <button type="submit" disabled={s.pending} style={{ marginTop: 12, width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none', background: '#111', color: '#fff', fontWeight: 600 }}>
          {s.pending ? 'Saving…' : 'Save nickname'}
        </button>
        <div style={{ marginTop: 8, fontSize: 12, color: '#777' }}>
          Stored locally as “{NICKNAME_LS_KEY}”. You can change it later in Settings.
        </div>
      </form>
    </div>
  );
}
