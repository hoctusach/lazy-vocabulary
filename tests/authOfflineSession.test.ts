/**
 * @vitest-environment jsdom
 * AUTH-12: an expired edge session plus no network must not sign the user out.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/edgeApi', () => ({
  exchangeNicknamePasscode: vi.fn(),
  setNicknamePasscode: vi.fn(),
}));

import { exchangeNicknamePasscode } from '@/lib/edgeApi';
import { ensureSupabaseAuthSession, isCredentialRejection } from '@/lib/auth';

const stored = {
  version: 4,
  session: { user_unique_key: 'tester', nickname: 'Tester', authenticated_at: new Date().toISOString(), user: { id: 'tester', nickname: 'Tester', email: null } },
};

describe('ensureSupabaseAuthSession with an expired edge session', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('lazyVoca.authState', JSON.stringify(stored));
    localStorage.setItem('lazyVoca.passcode', '1234');
    localStorage.setItem('lazyVoca.nickname', 'Tester');
    localStorage.setItem('lazyVoca.userKey', 'tester');
    vi.mocked(exchangeNicknamePasscode).mockReset();
  });

  it('keeps the stored sign-in when the network is down', async () => {
    vi.mocked(exchangeNicknamePasscode).mockRejectedValue(new TypeError('Failed to fetch'));
    const session = await ensureSupabaseAuthSession();
    expect(session?.nickname).toBe('Tester');
    expect(localStorage.getItem('lazyVoca.nickname')).toBe('Tester');
    expect(localStorage.getItem('lazyVoca.authState')).not.toBeNull();
    expect(localStorage.getItem('lazyVoca.userKey')).toBe('tester');
  });

  it('keeps the stored sign-in on a 5xx', async () => {
    vi.mocked(exchangeNicknamePasscode).mockRejectedValue(Object.assign(new Error('HTTP 503'), { status: 503 }));
    expect((await ensureSupabaseAuthSession())?.nickname).toBe('Tester');
    expect(localStorage.getItem('lazyVoca.authState')).not.toBeNull();
  });

  it('signs out when the server rejects the passcode', async () => {
    vi.mocked(exchangeNicknamePasscode).mockRejectedValue(Object.assign(new Error('bad'), { status: 401, code: 'INCORRECT_PASSCODE' }));
    expect(await ensureSupabaseAuthSession()).toBeNull();
    expect(localStorage.getItem('lazyVoca.authState')).toBeNull();
  });

  it('classifies errors', () => {
    expect(isCredentialRejection(new TypeError('Failed to fetch'))).toBe(false);
    expect(isCredentialRejection({ status: 500 })).toBe(false);
    expect(isCredentialRejection({ code: 'NICKNAME_NOT_FOUND' })).toBe(true);
    expect(isCredentialRejection({ status: 403 })).toBe(true);
  });
});
