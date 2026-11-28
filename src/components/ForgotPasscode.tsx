'use client';

import { useState } from 'react';
import { fetchPasscodeHint } from '@/lib/edgeApi';
import { friendlyAuthMessage } from '@/lib/auth/authMessages';
import { validateDisplayName } from '@/lib/nickname';
import { SUPPORT_EMAIL } from '@/config/links';

type Props = {
  initialNickname?: string;
  /** Back to the sign-in form; the nickname is kept so the user does not type it again. */
  onBack: (nickname: string) => void;
};

const fieldStyle = {
  width: '100%',
  minHeight: 44,
  padding: '10px 12px',
  fontSize: 16,
  borderRadius: 8,
  border: '1px solid var(--lv-field-border)',
  background: 'var(--lv-field-bg)',
  color: 'var(--lv-field-text)',
} as const;

const primaryStyle = {
  marginTop: 12,
  width: '100%',
  minHeight: 44,
  padding: '10px 12px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--lv-button-primary-bg)',
  color: 'var(--lv-button-primary-text)',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'block',
  textAlign: 'center',
  textDecoration: 'none',
  boxSizing: 'border-box',
} as const;

const secondaryStyle = {
  ...primaryStyle,
  marginTop: 10,
  border: '1px solid var(--lv-field-border)',
  background: 'var(--lv-button-secondary-bg)',
  color: 'var(--lv-button-secondary-text)',
  fontSize: 14,
  fontWeight: 500,
} as const;

/** "Forgot passcode?": ask for the nickname, show its hint (if any), then offer what the user can do next. */
export default function ForgotPasscode({ initialNickname = '', onBack }: Props) {
  const [nickname, setNickname] = useState(initialNickname);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  // undefined = not asked yet; null = asked, no hint; string = the hint
  const [result, setResult] = useState<string | null | undefined>(undefined);

  const asked = result !== undefined;
  const name = nickname.trim();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const problem = validateDisplayName(name);
    if (problem) {
      setError(problem);
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      setResult(await fetchPasscodeHint(name));
    } catch (err) {
      console.error('ForgotPasscode:hint', err);
      setError(friendlyAuthMessage(err, 'Could not look up the hint. Try again.'));
    } finally {
      setPending(false);
    }
  };

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Lazy Vocabulary: forgot passcode')}&body=${encodeURIComponent(
    `Hi, I forgot the passcode for my nickname: ${name}\n\n(Please do not write your passcode in this email.)`,
  )}`;

  return (
    <div
      className="lv-authgate-form"
      data-testid="forgot-screen"
      style={{
        width: 'min(420px, calc(100vw - 24px))',
        maxHeight: 'calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
        overflowY: 'auto',
        padding: 20,
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        borderRadius: 16,
        background: 'var(--lv-card-bg)',
        boxShadow: 'var(--lv-shadow)',
        fontFamily: 'system-ui, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <h3 style={{ margin: 0 }}>Forgot passcode?</h3>
      <p style={{ marginTop: 6, color: 'var(--lv-helper-text)', fontSize: 14 }}>
        Enter your nickname and we will show the hint you saved, if there is one.
      </p>

      <form onSubmit={onSubmit}>
        <label htmlFor="forgot-nickname" style={{ display: 'block', marginTop: 12, fontSize: 13, fontWeight: 600 }}>
          Nickname
        </label>
        <input
          id="forgot-nickname"
          data-testid="forgot-nickname"
          autoFocus={!initialNickname}
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setError(undefined);
            setResult(undefined);
          }}
          maxLength={40}
          disabled={pending}
          placeholder="e.g., Mi mi U"
          style={fieldStyle}
        />
        {error && (
          <div role="alert" data-testid="forgot-error" style={{ color: 'var(--lv-error)', marginTop: 8, fontSize: 13 }}>
            {error}
          </div>
        )}
        {!asked && (
          <button type="submit" data-testid="forgot-submit" disabled={pending} style={primaryStyle}>
            {pending ? 'Looking up…' : 'Show my hint'}
          </button>
        )}
      </form>

      {asked && (
        <div data-testid="forgot-result">
          <div
            role="status"
            data-testid="forgot-hint-result"
            style={{
              marginTop: 12,
              background: 'var(--lv-card-tone-2)',
              color: 'var(--lv-info)',
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 14,
              overflowWrap: 'anywhere',
            }}
          >
            {/* Plain text child: React escapes it, the hint is never parsed as HTML. */}
            {result === null ? 'No hint was set for this nickname.' : <>Your hint: <span data-testid="forgot-hint-text">{result}</span></>}
          </div>
          <p style={{ marginTop: 10, color: 'var(--lv-helper-text)', fontSize: 13 }}>
            Passcodes can&apos;t be recovered automatically yet. If the hint doesn&apos;t help, contact support and we
            will reset it for you by hand. Your progress is kept.
          </p>
          <button type="button" data-testid="forgot-try-again" onClick={() => onBack(name)} style={primaryStyle}>
            Try logging in again
          </button>
          <a data-testid="forgot-contact-support" href={mailto} style={secondaryStyle}>
            Contact support
          </a>
        </div>
      )}

      <button
        type="button"
        data-testid="forgot-back"
        onClick={() => onBack(name)}
        disabled={pending}
        style={{ ...secondaryStyle, background: 'transparent', border: 'none', fontSize: 13, textDecoration: 'underline' }}
      >
        Back to sign in
      </button>
    </div>
  );
}
