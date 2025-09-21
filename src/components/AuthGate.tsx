'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getNicknameLocal, validateDisplayName, NICKNAME_LS_KEY } from '../lib/nickname';
import {
  sanitizeNickname,
  normalizeNickname,
  getNicknameByKey,
  upsertNickname,
} from '@/services/nicknameService';
import { ensureUserKey } from '@/lib/progress/srsSyncByUserKey';
import { ensureProfile } from '@/lib/db/profiles';
import { EXCHANGE_FN_URL } from '@/config';
import {
  storeSessionFromExchange,
  type CustomSession,
  type ExchangeResponse,
} from '@/lib/customAuth';
import {
  registerNicknameWithPasscode,
  getStoredPasscode,
  PASSCODE_STORAGE_KEY,
  storePasscode,
} from '@/lib/auth';

type ExchangeResult = {
  response: Response;
  payload: ExchangeResponse;
  errorMessage?: string;
  errorCode?: string;
};

async function exchangeNicknamePasscode(nickname: string, passcode: string): Promise<ExchangeResult> {
  const response = await fetch(EXCHANGE_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, passcode }),
  });
  const payload = (await response.json().catch(() => ({}))) as ExchangeResponse;

  return {
    response,
    payload,
    errorMessage: typeof payload?.error === 'string' ? payload.error : undefined,
    errorCode: typeof payload?.code === 'string' ? payload.code : undefined,
  };
}

function saveSession(payload: ExchangeResponse, passcode: string): CustomSession {
  const session = storeSessionFromExchange(payload);
  storePasscode(passcode);
  return session;
}

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
  const passcodeRef = useRef<HTMLInputElement>(null);

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
        const { response, payload, errorMessage, errorCode } = await exchangeNicknamePasscode(
          sanitizedName,
          passcodeInput,
        );

        if (response.status === 404 && errorCode === 'PROFILE_NOT_FOUND') {
          setS((p) => ({
            ...p,
            pending: false,
            nickname: sanitizedName,
            passcode: passcodeInput,
            mode: 'create',
            error: undefined,
            info: 'No profile found for that nickname. Create one to get started.',
          }));
          return;
        }

        if (response.status === 401) {
          if (errorMessage === 'Incorrect passcode') {
            setS((p) => ({
              ...p,
              pending: false,
              passcode: '',
              error: 'Incorrect passcode',
              info: undefined,
              mode: 'signin',
            }));
            setTimeout(() => passcodeRef.current?.focus(), 0);
            return;
          }

          setS((p) => ({
            ...p,
            pending: false,
            error: 'Sign-in failed',
            info: undefined,
            mode: 'signin',
          }));
          return;
        }

        if (!response.ok) {
          setS((p) => ({
            ...p,
            pending: false,
            error: errorMessage || 'Sign-in failed',
            info: undefined,
            mode: 'signin',
          }));
          return;
        }

        const session = saveSession(payload, passcodeInput);
        const toastNickname = session.nickname?.trim().length ? session.nickname : sanitizedName;
        toast.success(`Signed in as ${toastNickname}`);
      } else {
        await registerNicknameWithPasscode(sanitizedName, passcodeInput, { rememberPasscode: true });
        const { response, payload, errorMessage } = await exchangeNicknamePasscode(
          sanitizedName,
          passcodeInput,
        );

        if (response.status === 401) {
          setS((p) => ({
            ...p,
            pending: false,
            error: errorMessage || 'Sign-in failed',
            info: undefined,
            mode: 'create',
          }));
          return;
        }

        if (!response.ok) {
          setS((p) => ({
            ...p,
            pending: false,
            error: errorMessage || 'Sign-in failed',
            info: undefined,
            mode: 'create',
          }));
          return;
        }

        const session = saveSession(payload, passcodeInput);
        const toastNickname = session.nickname?.trim().length ? session.nickname : sanitizedName;
        toast.success(`Signed in as ${toastNickname}`);
      }

      const existing = await getNicknameByKey(key);
      const chosen = existing ?? (await upsertNickname(sanitizedName));

      localStorage.setItem(NICKNAME_LS_KEY, chosen.name);
      await ensureProfile(chosen.name);
      await ensureUserKey().catch(() => null);
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
    } catch (err) {
      const error = err as { code?: string; status?: string; message?: string } | undefined;
      const code = error?.code ?? error?.status;
      const rawMessage = typeof error?.message === 'string' ? error.message : '';
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
  const isCreateMode = s.mode === 'create';
  const buttonLabel = s.pending
    ? isCreateMode
      ? 'Creating…'
      : 'Signing in…'
    : isCreateMode
    ? 'Create profile'
    : 'Sign in';
  const modeDescription = isCreateMode
    ? 'Pick a nickname and numeric passcode to create your profile. We will sign you in after saving it.'
    : 'Enter your nickname and passcode to sync progress across devices.';
  const passcodeHelpText = isCreateMode
    ? 'Choose a 4-10 digit passcode. Numbers only.'
    : PASSCODE_HELP;

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
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={() => setS((p) => ({ ...p, show: false }))}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            border: 'none',
            background: 'transparent',
            fontSize: 20,
            lineHeight: 1,
            cursor: 'pointer',
            color: '#666',
          }}
          aria-label="Close"
        >
          ×
        </button>
        <h3 style={{ margin: 0 }}>{isCreateMode ? 'Create your profile' : 'Access your vocabulary'}</h3>
        <p style={{ marginTop: 6, color: '#555', fontSize: 14 }}>{modeDescription}</p>
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
              info: p.mode === 'signin' ? undefined : p.info,
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
          ref={passcodeRef}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 14,
            borderRadius: 8,
            border: '1px solid #ccc',
            letterSpacing: 3,
          }}
        />
        <div style={{ marginTop: 4, fontSize: 12, color: '#777' }}>{passcodeHelpText}</div>
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
        {!isCreateMode && (
          <button
            type="button"
            onClick={() =>
              setS((p) => ({
                ...p,
                mode: 'create',
                info:
                  'Choose a nickname and 4-10 digit passcode. We will save it and sign you in automatically.',
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
            Create a new profile
          </button>
        )}
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
            Already have a passcode? Sign in
          </button>
        )}
        <div style={{ marginTop: 8, fontSize: 12, color: '#777' }}>
          Stored locally as “{NICKNAME_LS_KEY}”. You can update it later in Settings.
        </div>
      </form>
    </div>
  );
}
