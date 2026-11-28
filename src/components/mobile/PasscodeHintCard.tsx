import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fetchPasscodeHint, updatePasscodeHint } from '@/lib/edgeApi';
import { getSession } from '@/lib/customAuth';
import { getStoredPasscode } from '@/lib/auth';
import { getNicknameLocal } from '@/lib/nickname';
import { friendlyAuthMessage } from '@/lib/auth/authMessages';
import { HINT_WARNING, PASSCODE_HINT_MAX, validatePasscodeHint } from '@/lib/auth/passcodeHint';

/** Small Settings row: a signed-in user edits or clears their optional passcode hint (FB-77). */
const PasscodeHintCard: React.FC = () => {
  const nickname = getNicknameLocal()?.trim() || null;
  const [hint, setHint] = useState('');
  const [saved, setSaved] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!nickname) return;
    let off = false;
    fetchPasscodeHint(nickname)
      .then((h) => {
        if (off) return;
        setHint(h ?? '');
        setSaved(h ?? '');
      })
      .catch(() => undefined); // offline / not deployed: the row stays empty, saving still works
    return () => {
      off = true;
    };
  }, [nickname]);

  if (!nickname) return null;

  const save = async (value: string) => {
    const token = getSession()?.session_token;
    if (!token) {
      setError('Please sign in again to change your hint.');
      return;
    }
    const check = validatePasscodeHint(value, getStoredPasscode() ?? '');
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      await updatePasscodeHint(check.hint, token);
      setHint(check.hint ?? '');
      setSaved(check.hint ?? '');
      toast.success(check.hint ? 'Hint saved' : 'Hint removed');
    } catch (err) {
      console.error('PasscodeHintCard:save', err);
      setError(friendlyAuthMessage(err, 'Could not save the hint. Try again.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="lv-section p-4 pl-5 text-sm" data-section="passcode-hint" data-testid="passcode-hint-card">
      <h3 className="lv-section-title mb-2">Passcode hint</h3>
      <label htmlFor="settings-passcode-hint" className="block text-xs font-semibold">
        Passcode hint (optional)
      </label>
      <input
        id="settings-passcode-hint"
        data-testid="settings-hint-input"
        value={hint}
        maxLength={PASSCODE_HINT_MAX}
        disabled={pending}
        autoComplete="off"
        onChange={(e) => {
          setHint(e.target.value);
          setError(undefined);
        }}
        className="mt-1 w-full rounded-lg border px-3"
        style={{ minHeight: 44, fontSize: 16, borderColor: 'var(--lv-field-border)', background: 'var(--lv-field-bg)', color: 'var(--lv-field-text)' }}
      />
      <p className="mt-1 text-xs" style={{ color: 'var(--lv-helper-text)' }}>{HINT_WARNING}</p>
      {error && <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--lv-error)' }}>{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          data-testid="settings-hint-save"
          disabled={pending || hint.trim() === saved}
          onClick={() => void save(hint)}
          className="rounded-lg px-3 font-semibold"
          style={{ minHeight: 44, background: 'var(--lv-button-primary-bg)', color: 'var(--lv-button-primary-text)', opacity: pending || hint.trim() === saved ? 0.6 : 1 }}
        >
          Save hint
        </button>
        {saved && (
          <button
            type="button"
            data-testid="settings-hint-clear"
            disabled={pending}
            onClick={() => void save('')}
            className="rounded-lg border px-3"
            style={{ minHeight: 44, borderColor: 'var(--lv-field-border)' }}
          >
            Remove hint
          </button>
        )}
      </div>
    </div>
  );
};

export default PasscodeHintCard;
