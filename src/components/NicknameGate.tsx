'use client';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { getNicknameLocal, validateDisplayName, NICKNAME_LS_KEY } from '../lib/nickname';
import { ensureAuth } from '../lib/auth/ensureAuth';

type UIState = {
  ready: boolean;    // localStorage checked
  show: boolean;     // show modal?
  value: string;
  pending: boolean;
  error?: string;
  showClaim?: boolean;
  claimCode: string;
};

export default function NicknameGate() {
  const [s, setS] = useState<UIState>({ ready: false, show: false, value: '', pending: false, showClaim: false, claimCode: '' });

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
    const supabase = getSupabaseClient();
    const { userId } = await ensureAuth();

    const up = await supabase
      .from('nicknames')
      .upsert({ user_id: userId, display_name: nick }, { onConflict: 'user_id' });

    if (!up.error) {
      const rc = await supabase.rpc('rotate_claim_code', { p_display_name: nick });
      const code = rc.data || '';
      alert(code ? `Your claim code: ${code}` : 'Nickname saved.');
      localStorage.setItem('lazyVoca.nickname', nick);
      try { (await import('../lib/sync/flushLocalToServer')).flushLocalToServer(nick); } catch {}
      try { (await import('../lib/storage/migrateLocalVocabToDb')).migrateLocalVocabToDb?.(); } catch {}
      setS({ ready: true, show: false, value: nick, pending: false, showClaim: false, claimCode: '' });
      return;
    }

    if (up.error.code === '23505' || /unique|duplicate/i.test(up.error.message)) {
      setS(p => ({ ...(p as any), pending: false, error: undefined, showClaim: true, claimCode: '' }));
      return;
    }
    setS(p => ({ ...p, pending: false, error: up.error.message }));
  };

  const onClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    const nick = s.value.trim();
    const code = s.claimCode.trim();
    if (!code) { setS(p => ({ ...p, error: 'Enter claim code.' })); return; }
    setS(p => ({ ...p, pending: true, error: undefined }));
    const supabase = getSupabaseClient();
    await ensureAuth();
    const r = await supabase.rpc('claim_nickname', { p_display_name: nick, p_code: code });
    if (r.error) {
      setS(p => ({ ...p, pending: false, error: r.error.message }));
      return;
    }
    if (!r.data) {
      setS(p => ({ ...p, pending: false, error: 'Invalid claim code.' }));
      return;
    }
    const rc = await supabase.rpc('rotate_claim_code', { p_display_name: nick });
    const newCode = rc.data || '';
    alert(newCode ? `Your claim code: ${newCode}` : 'Nickname claimed.');
    localStorage.setItem('lazyVoca.nickname', nick);
    try { (await import('../lib/sync/flushLocalToServer')).flushLocalToServer(nick); } catch {}
    try { (await import('../lib/storage/migrateLocalVocabToDb')).migrateLocalVocabToDb?.(); } catch {}
    setS({ ready: true, show: false, value: nick, pending: false, showClaim: false, claimCode: '' });
  };

  const BLOCKED_CHARS_HELP = "< > \" ' ` $ \\ { } | ;";

  if (s.showClaim) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <form onSubmit={onClaim} style={{ width: 360, padding: 20, borderRadius: 12, background: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', fontFamily: 'system-ui, sans-serif' }}>
          <h3 style={{ margin: 0 }}>Claim nickname</h3>
          <p style={{ marginTop: 6, color: '#555', fontSize: 14 }}>
            Enter the claim code to transfer “{s.value}” to you.
          </p>
          <input
            autoFocus
            value={s.claimCode}
            onChange={(e) => setS(p => ({ ...p, claimCode: e.target.value, error: undefined }))}
            placeholder="6-digit code"
            maxLength={6}
            disabled={s.pending}
            style={{ width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #ccc' }}
          />
          {s.error && <div style={{ color: '#c00', marginTop: 8, fontSize: 13 }}>{s.error}</div>}
          <button type="submit" disabled={s.pending} style={{ marginTop: 12, width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none', background: '#111', color: '#fff', fontWeight: 600 }}>
            {s.pending ? 'Claiming…' : 'Claim nickname'}
          </button>
        </form>
      </div>
    );
  }

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
