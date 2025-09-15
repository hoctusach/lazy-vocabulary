'use client';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { getNicknameLocal, setNicknameLocal, validateNickname, NICKNAME_LS_KEY } from '../lib/nickname';

type UIState = {
  ready: boolean;    // localStorage checked
  show: boolean;     // show modal?
  value: string;
  pending: boolean;
  error?: string;
};

async function claimNicknameRemote(name: string): Promise<{ ok: true } | { ok: false; code: 'taken' | 'server'; message?: string }> {
  const supabase = getSupabaseClient();
  const { error, status } = await supabase.from('nicknames').insert([{ name }]);
  if (!error) return { ok: true };
  if ((error as any).code === '23505' || status === 409) return { ok: false, code: 'taken' };
  return { ok: false, code: 'server', message: error.message };
}

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
    const localErr = validateNickname(nick);
    if (localErr) { setS(p => ({ ...p, error: localErr })); return; }

    setS(p => ({ ...p, pending: true, error: undefined }));
    const res = await claimNicknameRemote(nick);

    if (res.ok) {
      setNicknameLocal(nick);
      const { flushLocalToServer } = await import('../lib/sync/flushLocalToServer');
      flushLocalToServer(nick);
      setS(p => ({ ...p, show: false, pending: false }));
      return;
    }
    if (res.code === 'taken') {
      setS(p => ({ ...p, pending: false, error: 'This nickname is already taken. Try another.' }));
    } else {
      setS(p => ({ ...p, pending: false, error: res.message ?? 'Could not save nickname. Please try again.' }));
    }
  };

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
          placeholder="e.g., hunter_123"
          maxLength={24}
          disabled={s.pending}
          style={{ width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #ccc' }}
        />
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
