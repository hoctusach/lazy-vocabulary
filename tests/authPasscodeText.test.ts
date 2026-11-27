/**
 * @vitest-environment jsdom
 * lib/auth sends the passcode as typed (A8).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const edge = vi.hoisted(() => ({ exchange: vi.fn(), create: vi.fn() }));
vi.mock('@/lib/edgeApi', () => ({
  exchangeNicknamePasscode: (...a: unknown[]) => edge.exchange(...a),
  setNicknamePasscode: (...a: unknown[]) => edge.create(...a),
}));
vi.mock('@/lib/supabaseClient', () => ({ getSupabaseClient: () => null }));

import { registerNicknameWithPasscode, signInWithPasscode } from '@/lib/auth';

beforeEach(() => {
  localStorage.clear();
  edge.exchange.mockReset().mockResolvedValue({ session_token: 't', expires_at: 4102444800, nickname: 'mimiu', user_unique_key: 'mimiu' });
  edge.create.mockReset().mockResolvedValue({});
});

describe('passcode sent as typed', () => {
  it.each(['0123', '00123', '123456', '0000000000'])('register keeps %s as text', async (code) => {
    await registerNicknameWithPasscode('mimiu', code);
    expect(edge.create).toHaveBeenCalledWith('mimiu', code);
  });

  it('trims spaces but keeps the digits', async () => {
    await registerNicknameWithPasscode('mimiu', '  0123 ');
    expect(edge.create).toHaveBeenCalledWith('mimiu', '0123');
  });

  it('sign in keeps leading zeros', async () => {
    await signInWithPasscode('mimiu', '0123');
    expect(edge.exchange).toHaveBeenCalledWith('mimiu', '0123');
  });

  it.each(['', '  ', 'abc', '12a4', '12.5', '-123', '1e5'])('rejects %j before any request', async (code) => {
    await expect(registerNicknameWithPasscode('mimiu', code)).rejects.toThrow('Passcode must be numeric.');
    await expect(signInWithPasscode('mimiu', code)).rejects.toThrow('Passcode must be numeric.');
    expect(edge.create).not.toHaveBeenCalled();
    expect(edge.exchange).not.toHaveBeenCalled();
  });

  it('remembers the passcode as typed', async () => {
    await signInWithPasscode('mimiu', '0123', { rememberPasscode: true });
    expect(localStorage.getItem('lazyVoca.passcode')).toBe('0123');
  });
});
