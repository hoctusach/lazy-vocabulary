'use client';

import { useEffect, useState } from 'react';
import { getNicknameLocal, validateDisplayName, NICKNAME_LS_KEY } from '../lib/nickname';
import {
  sanitizeNickname,
  normalizeNickname,
  getNicknameByKey,
  upsertNickname,
} from '@/services/nicknameService';
import { ensureUserKey } from '@/lib/progress/srsSyncByUserKey';
import { ensureProfile } from '@/lib/db/profiles';
import {
  registerNicknameWithPasscode,
  signInWithPasscode,
  getStoredPasscode,
  PASSCODE_STORAGE_KEY,
} from '@/lib/auth';
import { requireSupabaseClient } from '@/lib/supabaseClient';

const PASSCODE_HELP = '4-10 digits; numbers only.';

type Mode = 'signin' | 'create';

type UIState = {
  ready: boolean;
  show: boolean;
  nickname: string;
  passcode: string;
  pending: boolean;
  mode: Mode;
  error?: string;
  info?: string;
};

function validatePasscode(passcode: string): string | null {
  const trimmed = passcode.trim();
  if (trimmed.length < 4) return 'Passcode must be at least 4 digits.';
  if (trimmed.length > 10) return 'Passcode must be at most 10 digits.';
  if (!/^\d+$/.test(trimmed)) return 'Passcode can only contain numbers.';
  return null;
}

function toNumericPasscode(passcode: string): number {
  const numeric = Number.parseInt(passcode, 10);
  if (Number.isNaN(numeric)) {
    throw new Error('Passcode must be numeric.');
  }
  return numeric;
}

async function verifyNicknamePasscode(nickname: string, passcode: string): Promise<string | null> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.rpc('verify_nickname_passcode', {
    nickname,
    passcode: toNumericPasscode(passcode), // 👈 ensure int8
  });
  if (error) {
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : null;
  const key = row?.user_unique_key;
  return typeof key === 'string' && key.length ? key : null;
}

async function setNicknamePasscode(nickname: string, passcode: string): Promise<void> {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.rpc('set_nickname_passcode', {
    nickname,
    passcode: toNumericPasscode(passcode), // 👈 ensure int8
  });
  if (error) {
    throw error;
  }
}

export default function AuthGate() {
  const [s, setS] = useState<UIState>({
    ready: false,
    show: false,
    nickname: '',
    passcode: '',
    pending: false,
    mode: 'signin',
  });

  useEffect(() => {
    const existingNickname = getNicknameLocal();
    const existingPasscode = getStoredPasscode();
    const hasNickname = !!existingNickname;
    const hasPasscode = !!existingPasscode;

    setS((prev) => ({
      ...prev,
      ready: true,
      show: !(hasNickname && hasPasscode),
      nickname: '',
      passcode: '',
      mode: 'signin',
    }));

    function syncVisibility(opts?: { nickname?: string | null; passcode?: string | null }) {
      const nicknamePresent =
        opts && 'nickname' in opts ? !!opts.nickname : !!getNicknameLocal();
      const passcodePresent =
        opts && 'passcode' in opts ? !!opts.passcode : !!getStoredPasscode();
      setS((p) => ({ ...p, show: !(nicknamePresent && passcodePresent) }));
    }

    function onStorage(e: StorageEvent) {
      if (!e.key) {
        syncVisibility();
        return;
      }
      if (e.key === NICKNAME_LS_KEY) {
        syncVisibility({ nickname: e.newValue });
      } else if (e.key === PASSCODE_STORAGE_KEY) {
        syncVisibility({ passcode: e.newValue });
      }
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!s.ready || !s.show) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (s.pending) return;

    const nicknameInput = s.nickname.trim();
    const passcodeInput = s.passcode.trim();

    const nicknameError = validateDisplayName(nicknameInput);
    if (nicknameError) {
      setS((p) => ({ ...p, error: nicknameError, info: undefined }));
      return;
    }

    const passcodeError = validatePasscode(passcodeInput);
    if (passcodeError) {
      setS((p) => ({ ...p, error: passcodeError, info: undefined }));
      return;
    }

    setS((p) => ({ ...p, pending: true, error: undefined, info: undefined }));

    const sanitizedName = sanitizeNickname(nicknameInput);
    const key = normalizeNickname(sanitizedName);

    try {
      if (s.mode === 'signin') {
        const verified = await verifyNicknamePasscode(sanitizedName, passcodeInput);
        if (!verified) {
          setS((p) => ({
            ...p,
            pending: false,
            mode: 'create',
            info:
              "We couldn't verify that passcode. Create one to secure your progress, or try signing in again.",
            error: undefined,
          }));
          return;
        }
        await signInWithPasscode(sanitizedName, passcodeInput, { rememberPasscode: true });
      } else {
        await registerNicknameWithPasscode(sanitizedName, passcodeInput, { rememberPasscode: true });
      }

      const existing = await getNicknameByKey(key);
      const chosen = existing ?? (await upsertNickname(sanitizedName));

      localStorage.setItem(NICKNAME_LS_KEY, chosen.name);
      await ensureProfile(chosen.name);
      await ensureUserKey().catch(() => null);
      if (s.mode === 'create') {
        try {
          await setNicknamePasscode(sanitizedName, passcodeInput);
        } catch (rpcErr) {
          console.warn('auth:set_nickname_passcode', (rpcErr as Error).message);
        }
      }
      try {
        const mod = await import('../lib/sync/autoBackfillOnReload');
        void mod.autoBackfillOnReload();
      } catch {
        // ignore backfill errors
      }
      try {
        (await import('../lib/storage/migrateLocalVocabToDb')).migrateLocalVocabToDb?.();
      } catch {
        // ignore migration errors
      }

      setS({
        ready: true,
        show: false,
        nickname: chosen.name,
        passcode: '',
        pending: false,
        mode: 'signin',
      });
    } catch (err: any) {
      const code = err?.code ?? err?.status;
      const rawMessage = typeof err?.message === 'string' ? err.message : '';
      const lowerMessage = rawMessage.toLowerCase();
      const message =
        code === 'NICKNAME_TAKEN' || code === '23505' || lowerMessage.includes('already registered')
          ? 'That nickname is already taken. Try another.'
          : lowerMessage.includes('invalid login credentials') ||
            lowerMessage.includes('incorrect passcode')
          ? 'That passcode is incorrect. Please try again.'
          : rawMessage || 'Failed to save nickname';
      setS((p) => ({ ...p, pending: false, error: message }));
    }
  };

  const BLOCKED_CHARS_HELP = "< > \" ' ` $ \\ { } | ;";
  const buttonLabel = s.pending
    ? s.mode === 'signin'
      ? 'Signing in…'
      : 'Creating…'
    : s.mode === 'signin'
    ? 'Sign in'
    : 'Create new profile';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: 360,
          padding: 20,
          borderRadius: 12,
          background: '#fff',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h3 style={{ margin: 0 }}>Access your vocabulary</h3>
        <p style={{ marginTop: 6, color: '#555', fontSize: 14 }}>
          Enter your nickname and passcode to sync progress across devices. First time here? Create a passcode below.
        </p>
        <label style={{ display: 'block', marginTop: 12, fontSize: 13, fontWeight: 600 }}>
          Nickname
        </label>
        <input
          autoFocus
          value={s.nickname}
          onChange={(e) =>
            setS((p) => ({
              ...p,
              nickname: e.target.value,
              error: undefined,
              info: undefined,
              mode: 'signin',
            }))
          }
          placeholder="e.g., Mi mi U"
          maxLength={40}
          disabled={s.pending}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 14,
            borderRadius: 8,
            border: '1px solid #ccc',
          }}
        />
        <div style={{ marginTop: 4, fontSize: 12, color: '#777' }}>
          Names match case-insensitively and ignore spaces. Allowed: most characters; blocked: {BLOCKED_CHARS_HELP}
        </div>
        <label style={{ display: 'block', marginTop: 12, fontSize: 13, fontWeight: 600 }}>
          Passcode
        </label>
        <input
          type="password"
          value={s.passcode}
          onChange={(e) =>
            setS((p) => ({ ...p, passcode: e.target.value, error: undefined }))
          }
          placeholder="Enter passcode"
          maxLength={10}
          disabled={s.pending}
          inputMode="numeric"
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 14,
            borderRadius: 8,
            border: '1px solid #ccc',
            letterSpacing: 3,
          }}
        />
        <div style={{ marginTop: 4, fontSize: 12, color: '#777' }}>{PASSCODE_HELP}</div>
        {s.info && (
          <div
            style={{
              marginTop: 10,
              background: '#f0f9ff',
              color: '#0c4a6e',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            {s.info}
          </div>
        )}
        {s.error && (
          <div style={{ color: '#c00', marginTop: 8, fontSize: 13 }}>{s.error}</div>
        )}
        <button
          type="submit"
          disabled={s.pending}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: 'none',
            background: '#111',
            color: '#fff',
            fontWeight: 600,
            cursor: s.pending ? 'default' : 'pointer',
          }}
        >
          {buttonLabel}
        </button>
        {s.mode === 'create' && (
          <button
            type="button"
            onClick={() =>
              setS((p) => ({
                ...p,
                mode: 'signin',
                info: undefined,
                error: undefined,
              }))
            }
            disabled={s.pending}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #d4d4d4',
              background: '#fafafa',
              color: '#333',
              fontSize: 13,
              cursor: s.pending ? 'default' : 'pointer',
            }}
          >
            Already have a passcode? Try again
          </button>
        )}
        <div style={{ marginTop: 8, fontSize: 12, color: '#777' }}>
          Stored locally as “{NICKNAME_LS_KEY}”. You can update it later in Settings.
        </div>
      </form>
    </div>
  );
}
