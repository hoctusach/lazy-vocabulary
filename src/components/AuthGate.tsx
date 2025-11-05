'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getNicknameLocal, validateDisplayName, NICKNAME_LS_KEY } from '../lib/nickname';
import { sanitizeNickname } from '@/services/nicknameService';
import { ensureUserKey } from '@/lib/progress/srsSyncByUserKey';
import { saveSession, type Session as EdgeSession } from '@/lib/customAuth';
import { exchangeNicknamePasscode, setNicknamePasscode } from '@/lib/edgeApi';
import {
  getStoredPasscode,
  PASSCODE_STORAGE_KEY,
  storePasscode,
} from '@/lib/auth';
import type { SeverityLevel } from '@/types/learning';
import { identifyUser } from '@/services/analyticsService';
import { dispatchNicknameChange, NICKNAME_EVENT_NAME } from '@/lib/nicknameEvents';
import type { NicknameEventDetail } from '@/lib/nicknameEvents';
import { initializeSpeechSystem } from '@/utils/speech';
import { markUserInteraction } from '@/utils/userInteraction';

function isSeverityLevel(value: unknown): value is SeverityLevel {
  return value === 'light' || value === 'moderate' || value === 'intense';
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

    function onNicknameChange(event: Event) {
      const detail = (event as CustomEvent<NicknameEventDetail>).detail;
      syncVisibility({ nickname: detail?.nickname ?? null });
    }

    window.addEventListener('storage', onStorage);
    window.addEventListener(NICKNAME_EVENT_NAME, onNicknameChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(NICKNAME_EVENT_NAME, onNicknameChange);
    };
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
    const trimmedPasscode = passcodeInput.trim();
    const isCreateMode = s.mode === 'create';

    const handleExchangeError = (error: unknown) => {
      const code = typeof (error as { code?: unknown })?.code === 'string'
        ? (error as { code: string }).code
        : undefined;
      if (code === 'NICKNAME_NOT_FOUND') {
        setS((p) => ({
          ...p,
          pending: false,
          show: true,
          mode: 'create',
          nickname: sanitizedName,
          passcode: trimmedPasscode,
          info: 'We couldn’t find this nickname. Create a profile to continue.',
          error: undefined,
        }));
        return true;
      }
      if (code === 'INCORRECT_PASSCODE') {
        setS((p) => ({
          ...p,
          pending: false,
          show: true,
          mode: 'signin',
          passcode: '',
          error: 'Incorrect passcode. Try again.',
          info: undefined,
        }));
        setTimeout(() => passcodeRef.current?.focus(), 0);
        return true;
      }
      return false;
    };

    const completeSignIn = async (options?: { nicknameHint?: string; blockUntilReady?: boolean }) => {
      const nicknameHint = options?.nicknameHint;
      const blockUntilReady = options?.blockUntilReady ?? false;
      const session = (await exchangeNicknamePasscode(
        sanitizedName,
        trimmedPasscode,
      )) as EdgeSession;
      saveSession(session);
      storePasscode(trimmedPasscode);

      try {
        markUserInteraction();
      } catch (error) {
        console.warn('AuthGate:markUserInteraction', error);
      }

      void initializeSpeechSystem().catch((error) => {
        console.warn('AuthGate:initializeSpeechSystem', error);
      });

      const displayNameFromSession =
        (typeof session?.name === 'string' && session.name.trim().length
          ? session.name
          : undefined) ??
        (typeof session?.nickname === 'string' && session.nickname.trim().length
          ? session.nickname
          : undefined) ??
        (nicknameHint && nicknameHint.trim().length ? nicknameHint : undefined) ??
        sanitizedName;

      toast.success(`Signed in as ${displayNameFromSession}`);

      localStorage.setItem(NICKNAME_LS_KEY, displayNameFromSession);
      dispatchNicknameChange(displayNameFromSession);

      let userKey: string | null = null;
      try {
        userKey = await ensureUserKey();
      } catch (error) {
        console.error('AuthGate:ensureUserKey', error);
      }

      let prepareSelectionPromise: Promise<void> | null = null;
      if (userKey) {
        identifyUser(userKey, displayNameFromSession);
        prepareSelectionPromise = (async () => {
          try {
            const [{ getPreferences }, progress] = await Promise.all([
              import('../lib/db/preferences'),
              import('../services/learningProgressService'),
            ]);
            const prefs = await getPreferences();
            const severity = isSeverityLevel(prefs?.daily_option)
              ? prefs.daily_option
              : 'light';
            const mode = progress.getModeForSeverity(severity);
            const count = progress.getCountForSeverity(severity);
            await progress.fetchAndCommitTodaySelection({
              userKey,
              mode,
              count,
              category: null,
            });
          } catch (error) {
            console.error('AuthGate:prepareTodaySelection', error);
            toast.error("Failed to prepare today's words. Please refresh if they don't load.");
            throw error;
          }
        })();
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

      if (prepareSelectionPromise) {
        if (blockUntilReady) {
          try {
            await prepareSelectionPromise;
          } catch {
            // Error already handled above.
          }
        } else {
          void prepareSelectionPromise.catch(() => {
            /* handled */
          });
        }
      }

      setS({
        ready: true,
        show: false,
        nickname: displayNameFromSession,
        passcode: '',
        pending: false,
        mode: 'signin',
      });

      if (typeof window !== 'undefined') {
        setTimeout(() => {
          try {
            window.location.reload();
          } catch (error) {
            console.error('AuthGate:reloadAfterSignIn', error);
          }
        }, 0);
      }
    };

    if (isCreateMode) {
      let nicknameHint: string | undefined;
      try {
        const result = (await setNicknamePasscode(sanitizedName, trimmedPasscode)) as {
          nickname?: string;
          name?: string;
        };
        if (typeof result?.name === 'string' && result.name.trim().length) {
          nicknameHint = result.name;
        } else {
          nicknameHint =
            typeof result?.nickname === 'string' && result.nickname.trim().length
              ? result.nickname
              : undefined;
        }
      } catch (error) {
        console.error('AuthGate:createProfile', error);
        if (handleExchangeError(error)) return;
        const rawMessage = typeof (error as { message?: string })?.message === 'string'
          ? (error as { message?: string }).message
          : '';
        const message = rawMessage.trim().length ? rawMessage.trim() : 'Failed to save nickname';
        const isTaken = /409|taken|exists|NICKNAME_TAKEN/i.test(message);
        setS((p) => ({
          ...p,
          pending: false,
          error: isTaken ? 'That nickname is already taken. Try another.' : message,
          info: undefined,
          mode: 'create',
        }));
        return;
      }

      try {
        await completeSignIn({ nicknameHint, blockUntilReady: true });
        return;
      } catch (error) {
        console.error('AuthGate:signInAfterCreate', error);
        if (handleExchangeError(error)) return;
        const rawMessage = typeof (error as { message?: string })?.message === 'string'
          ? (error as { message?: string }).message
          : '';
        const message = rawMessage.trim().length ? rawMessage.trim() : 'Sign-in failed';
        setS((p) => ({
          ...p,
          pending: false,
          error: message,
          info: undefined,
          mode: 'signin',
        }));
        return;
      }
    }

    try {
      await completeSignIn();
    } catch (error) {
      console.error('AuthGate:signIn', error);
      if (handleExchangeError(error)) return;
      const rawMessage = typeof (error as { message?: string })?.message === 'string'
        ? (error as { message?: string }).message
        : '';
      const message = rawMessage.trim().length ? rawMessage.trim() : 'Sign-in failed';
      setS((p) => ({
        ...p,
        pending: false,
        error: message,
        info: undefined,
        mode: 'signin',
      }));
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
        background: 'var(--lv-overlay)',
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
          background: 'var(--lv-card-bg)',
          boxShadow: 'var(--lv-shadow)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        <h3 style={{ margin: 0 }}>{isCreateMode ? 'Create your profile' : 'Access your vocabulary'}</h3>
        <p style={{ marginTop: 6, color: 'var(--lv-helper-text)', fontSize: 14 }}>{modeDescription}</p>
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
            border: '1px solid var(--lv-field-border)',
            background: 'var(--lv-field-bg)',
            color: 'var(--lv-field-text)',
          }}
        />
        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--lv-helper-text)' }}>
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
            border: '1px solid var(--lv-field-border)',
            background: 'var(--lv-field-bg)',
            color: 'var(--lv-field-text)',
            letterSpacing: 3,
          }}
        />
        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--lv-helper-text)' }}>{passcodeHelpText}</div>
        {s.info && (
          <div
            style={{
              marginTop: 10,
              background: 'var(--lv-card-tone-2)',
              color: 'var(--lv-info)',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            {s.info}
          </div>
        )}
        {s.error && (
          <div style={{ color: 'var(--lv-error)', marginTop: 8, fontSize: 13 }}>{s.error}</div>
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
            background: 'var(--lv-button-primary-bg)',
            color: 'var(--lv-button-primary-text)',
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
              border: '1px solid var(--lv-field-border)',
              background: 'var(--lv-button-secondary-bg)',
              color: 'var(--lv-button-secondary-text)',
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
              border: '1px solid var(--lv-field-border)',
              background: 'var(--lv-button-secondary-bg)',
              color: 'var(--lv-button-secondary-text)',
              fontSize: 13,
              cursor: s.pending ? 'default' : 'pointer',
            }}
          >
            Already have a passcode? Sign in
          </button>
        )}
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--lv-helper-text)' }}>
          Stored locally as “{NICKNAME_LS_KEY}”. You can update it later in Settings.
        </div>
      </form>
    </div>
  );
}
