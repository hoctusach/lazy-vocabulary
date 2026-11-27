/**
 * @vitest-environment jsdom
 * The sign-in / create-profile screen (A7, A9-A12, A16, A17, A25).
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  exchange: vi.fn(),
  create: vi.fn(),
  saveSession: vi.fn(),
  storePasscode: vi.fn(),
  getStoredPasscode: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: (...a: unknown[]) => h.toastSuccess(...a), error: (...a: unknown[]) => h.toastError(...a) } }));
vi.mock('@/lib/edgeApi', () => ({
  exchangeNicknamePasscode: (...a: unknown[]) => h.exchange(...a),
  setNicknamePasscode: (...a: unknown[]) => h.create(...a),
}));
vi.mock('@/lib/customAuth', () => ({ saveSession: (...a: unknown[]) => h.saveSession(...a) }));
vi.mock('@/lib/auth', () => ({
  getStoredPasscode: () => h.getStoredPasscode(),
  PASSCODE_STORAGE_KEY: 'lazyVoca.passcode',
  storePasscode: (...a: unknown[]) => h.storePasscode(...a),
}));
vi.mock('@/lib/progress/srsSyncByUserKey', () => ({ ensureUserKey: vi.fn().mockResolvedValue(null) }));
vi.mock('@/services/analyticsService', () => ({ identifyUser: vi.fn() }));
vi.mock('@/utils/speech', () => ({ initializeSpeechSystem: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/utils/userInteraction', () => ({ markUserInteraction: vi.fn() }));
vi.mock('@/lib/sync/autoBackfillOnReload', () => ({ autoBackfillOnReload: vi.fn() }));
vi.mock('@/lib/storage/migrateLocalVocabToDb', () => ({ migrateLocalVocabToDb: vi.fn() }));

import AuthGate from '@/components/AuthGate';

const err = (message: string, code?: string, status?: number) => Object.assign(new Error(message), { code, status });
const nameInput = () => screen.getByPlaceholderText('e.g., Mi mi U') as HTMLInputElement;
const codeInput = () => screen.getByPlaceholderText('Enter passcode') as HTMLInputElement;
const type = (nick: string, code: string) => {
  fireEvent.change(nameInput(), { target: { value: nick } });
  fireEvent.change(codeInput(), { target: { value: code } });
};
const submit = async (label = 'Sign in') => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: label }));
  });
};

beforeEach(() => {
  localStorage.clear();
  Object.values(h).forEach((m) => m.mockReset());
  h.getStoredPasscode.mockReturnValue(null);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => cleanup());

describe('when the screen is shown (A25)', () => {
  it('is shown on a new device', async () => {
    render(<AuthGate />);
    expect(await screen.findByText('Access your vocabulary')).toBeTruthy();
  });

  it('is hidden when a nickname and a passcode are stored', async () => {
    localStorage.setItem('lazyVoca.nickname', 'Mi mi U');
    h.getStoredPasscode.mockReturnValue('123456');
    const { container } = render(<AuthGate />);
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });

  it('is shown when only one of them is stored', async () => {
    localStorage.setItem('lazyVoca.nickname', 'Mi mi U');
    render(<AuthGate />);
    expect(await screen.findByText('Access your vocabulary')).toBeTruthy();
  });
});

describe('input checks before any request (A1, A7)', () => {
  beforeEach(async () => {
    render(<AuthGate />);
    await screen.findByText('Access your vocabulary');
  });

  it.each([
    ['ab', '123456', 'Nickname must be at least 3 characters.'],
    ['a$b', '123456', 'Nickname contains blocked characters.'],
    ['mimiu', '123', 'Passcode must be at least 4 digits.'],
    ['mimiu', '12345678901', 'Passcode must be at most 10 digits.'],
    ['mimiu', '12ab56', 'Passcode can only contain numbers.'],
    ['mimiu', '12 345', 'Passcode can only contain numbers.'],
  ])('%j / %j shows "%s"', async (nick, code, message) => {
    type(nick, code);
    await submit();
    expect(await screen.findByText(message)).toBeTruthy();
    expect(h.exchange).not.toHaveBeenCalled();
    expect(h.create).not.toHaveBeenCalled();
  });
});

describe('sign in (A9, A10, A11, A16, A17)', () => {
  beforeEach(async () => {
    render(<AuthGate />);
    await screen.findByText('Access your vocabulary');
  });

  it('a wrong passcode shows the message, clears the passcode and keeps the name', async () => {
    h.exchange.mockRejectedValue(err('Incorrect passcode', 'INCORRECT_PASSCODE', 401));
    type('mimiu', '999999');
    await submit();
    expect(await screen.findByText('Incorrect passcode. Try again.')).toBeTruthy();
    expect(codeInput().value).toBe('');
    expect(nameInput().value).toBe('mimiu');
    expect(h.saveSession).not.toHaveBeenCalled();
    expect(h.storePasscode).not.toHaveBeenCalled();
  });

  it('an unknown nickname switches to "Create your profile" and keeps what was typed', async () => {
    h.exchange.mockRejectedValue(err('not found', 'NICKNAME_NOT_FOUND', 404));
    type('newbie', '123456');
    await submit();
    expect(await screen.findByText('Create your profile')).toBeTruthy();
    expect(screen.getByText(/couldn’t find this nickname/)).toBeTruthy();
    expect(nameInput().value).toBe('newbie');
    expect(codeInput().value).toBe('123456');
  });

  it('a passcode that starts with 0 is sent as typed when signing in', async () => {
    h.exchange.mockResolvedValue({ session_token: 't', nickname: 'Old' });
    type('oldtimer', '012345');
    await submit();
    await waitFor(() => expect(h.exchange).toHaveBeenCalledWith('oldtimer', '012345'));
  });

  it('the right passcode saves the session and the passcode', async () => {
    const session = { session_token: 't', nickname: 'Mi mi U', user_unique_key: 'mimiu' };
    h.exchange.mockResolvedValue(session);
    type('Mi mi U', '123456');
    await submit();
    await waitFor(() => expect(h.saveSession).toHaveBeenCalledWith(session));
    expect(h.storePasscode).toHaveBeenCalledWith('123456');
    expect(h.exchange).toHaveBeenCalledWith('Mi mi U', '123456');
    expect(localStorage.getItem('lazyVoca.nickname')).toBe('Mi mi U');
    expect(h.toastSuccess).toHaveBeenCalled();
  });

  it('a network error shows a friendly message (never "Failed to fetch") and lets the learner try again', async () => {
    h.exchange.mockRejectedValue(new Error('Failed to fetch'));
    type('mimiu', '123456');
    await submit();
    expect(await screen.findByText("Can't reach the server. Check your internet connection and try again.")).toBeTruthy();
    expect(screen.queryByText('Failed to fetch')).toBeNull();
    expect((screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it.each([
    [err('boom', undefined, 500)],
    [err('HTTP 502')],
  ])('a server problem (%o) shows "The server is having trouble"', async (failure) => {
    h.exchange.mockRejectedValue(failure);
    type('mimiu', '123456');
    await submit();
    expect(await screen.findByText('The server is having trouble right now. Please try again in a moment.')).toBeTruthy();
  });

  it('an error without a message falls back to "Sign-in failed"', async () => {
    h.exchange.mockRejectedValue({});
    type('mimiu', '123456');
    await submit();
    expect(await screen.findByText('Sign-in failed')).toBeTruthy();
  });

  it('a second tap while the request is running does not send a second request', async () => {
    let finish: (v: unknown) => void = () => undefined;
    h.exchange.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    type('mimiu', '123456');
    await submit();
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeTruthy();
    fireEvent.submit(screen.getByRole('button', { name: 'Signing in…' }).closest('form')!);
    expect(h.exchange).toHaveBeenCalledTimes(1);
    await act(async () => finish({ session_token: 't' }));
  });

  it.each(['Mi (mi)', '(((', 'a[b]'])('rejects %j instead of changing it silently (A3)', async (nick) => {
    type(nick, '123456');
    await submit();
    expect(await screen.findByText('Nickname contains blocked characters.')).toBeTruthy();
    expect(h.exchange).not.toHaveBeenCalled();
  });
});

describe('create profile (A12, A13)', () => {
  beforeEach(async () => {
    render(<AuthGate />);
    await screen.findByText('Access your vocabulary');
    fireEvent.click(screen.getByRole('button', { name: 'Create a new profile' }));
    await screen.findByText('Create your profile');
  });

  it('creates the profile, then signs in', async () => {
    h.create.mockResolvedValue({ nickname: 'Newbie' });
    h.exchange.mockResolvedValue({ session_token: 't', nickname: 'Newbie' });
    type('Newbie', '123456');
    await submit('Create profile');
    await waitFor(() => expect(h.saveSession).toHaveBeenCalled());
    expect(h.create).toHaveBeenCalledWith('Newbie', '123456');
    expect(h.exchange).toHaveBeenCalledWith('Newbie', '123456');
    expect(h.create.mock.invocationCallOrder[0]).toBeLessThan(h.exchange.mock.invocationCallOrder[0]);
  });

  it('a taken nickname shows "already taken" and does not sign in', async () => {
    h.create.mockRejectedValue(err('Nickname already exists', 'NICKNAME_TAKEN', 409));
    type('mimiu', '222222');
    await submit('Create profile');
    expect(await screen.findByText('That nickname is already taken. Try another.')).toBeTruthy();
    expect(h.exchange).not.toHaveBeenCalled();
    expect(h.saveSession).not.toHaveBeenCalled();
  });

  it.each(['0123', '000000'])('accepts a new passcode that starts with 0 and sends it as typed: %s', async (code) => {
    h.create.mockResolvedValue({ nickname: 'Newbie' });
    h.exchange.mockResolvedValue({ session_token: 't', nickname: 'Newbie' });
    type('Newbie', code);
    await submit('Create profile');
    await waitFor(() => expect(h.create).toHaveBeenCalledWith('Newbie', code));
    expect(h.exchange).toHaveBeenCalledWith('Newbie', code);
    expect(h.storePasscode).toHaveBeenCalledWith(code);
  });

  it('can go back to sign in', async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Already have a passcode? Sign in' }));
    expect(await screen.findByText('Access your vocabulary')).toBeTruthy();
  });

  it('the same checks apply when creating', async () => {
    type('ab', '123456');
    await submit('Create profile');
    expect(await screen.findByText('Nickname must be at least 3 characters.')).toBeTruthy();
    expect(h.create).not.toHaveBeenCalled();
  });
});
