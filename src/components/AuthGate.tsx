'use client';

import { useEffect, useState } from 'react';
import {
  getNicknameLocal,
  validateDisplayName,
  NICKNAME_LS_KEY,
} from '../lib/nickname';
import {
  sanitizeDisplay,
  normalizeNickname,
  getNicknameByKey,
  upsertNickname,
} from '@/services/nicknameService';
import { ensureUserKey } from '@/lib/progress/srsSyncByUserKey';
import {
  PasscodeAuthError,
  signInWithPasscode,
  signUp,
} from '@/lib/auth/passcodeAuth';

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
    const existing = getNicknameLocal();
    setS((prev) => ({
      ...prev,
      ready: true,
      show: !existing,
      nickname: '',
      passcode: '',
      mode: 'signin',
    }));

    function onStorage(e: StorageEvent) {
      if (e.key === NICKNAME_LS_KEY && e.newValue) {
        setS((p) => ({ ...p, show: false }));
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

    const display = sanitizeDisplay(nicknameInput);
    const key = normalizeNickname(display);

    try {
      if (s.mode === 'signin') {
        await signInWithPasscode(display, passcodeInput);
      } else {
        await signUp(display, passcodeInput);
      }

      const existing = await getNicknameByKey(key);
      const chosen = existing ?? (await upsertNickname(display));

      localStorage.setItem(NICKNAME_LS_KEY, chosen.name);
      void ensureUserKey().catch(() => {});
      try {
        const mod = await import('../lib/sync/autoBackfillOnReload');
        void mod.autoBackfillOnReload();
      } catch {}
      try {
        (await import('../lib/storage/migrateLocalVocabToDb')).migrateLocalVocabToDb?.();
      } catch {}

      setS({
        ready: true,
        show: false,
        nickname: chosen.name,
        passcode: '',
        pending: false,
        mode: 'signin',
      });
    } catch (err: any) {
      if (err instanceof PasscodeAuthError) {
        if (err.code === 'ACCOUNT_NOT_FOUND') {
          setS((p) => ({
            ...p,
            pending: false,
            mode: 'create',
            info: 'No passcode found for this nickname. Create one to secure your progress.',
            error: undefined,
          }));
          return;
        }
        const authMessage =
          err.code === 'INVALID_PASSCODE'
            ? 'That passcode is incorrect. Please try again.'
            : err.message;
        setS((p) => ({ ...p, pending: false, error: authMessage }));
        return;
      }

      const code = err?.code;
      const message =
        code === 'NICKNAME_TAKEN' || code === '23505'
          ? 'That nickname is already taken. Try another.'
          : err?.message || 'Failed to save nickname';
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
    : 'Create passcode';

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
