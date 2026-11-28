/**
 * @vitest-environment jsdom
 * [FB-78] "Forgot passcode?" screen and [FB-77] hint field at sign-up.
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ exchange: vi.fn(), create: vi.fn(), hint: vi.fn() }));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/edgeApi', () => ({
  exchangeNicknamePasscode: (...a: unknown[]) => h.exchange(...a),
  setNicknamePasscode: (...a: unknown[]) => h.create(...a),
  fetchPasscodeHint: (...a: unknown[]) => h.hint(...a),
}));
vi.mock('@/lib/customAuth', () => ({ saveSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getStoredPasscode: () => null, PASSCODE_STORAGE_KEY: 'lazyVoca.passcode', storePasscode: vi.fn() }));
vi.mock('@/lib/progress/srsSyncByUserKey', () => ({ ensureUserKey: vi.fn().mockResolvedValue(null) }));
vi.mock('@/services/analyticsService', () => ({ identifyUser: vi.fn() }));
vi.mock('@/utils/speech', () => ({ initializeSpeechSystem: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/utils/userInteraction', () => ({ markUserInteraction: vi.fn() }));
vi.mock('@/lib/sync/autoBackfillOnReload', () => ({ autoBackfillOnReload: vi.fn() }));
vi.mock('@/lib/storage/migrateLocalVocabToDb', () => ({ migrateLocalVocabToDb: vi.fn() }));

import AuthGate from '@/components/AuthGate';
import { SUPPORT_EMAIL } from '@/config/links';

const click = async (el: HTMLElement) => act(async () => { fireEvent.click(el); });
const id = (t: string) => screen.getByTestId(t);

beforeEach(() => {
  localStorage.clear();
  Object.values(h).forEach((m) => m.mockReset());
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => cleanup());

async function openForgot(nick = 'Mi mi U') {
  render(<AuthGate />);
  fireEvent.change(screen.getByPlaceholderText('e.g., Mi mi U'), { target: { value: nick } });
  await click(id('forgot-passcode-link'));
}
const ask = async () => click(id('forgot-submit'));

describe('[FB-78] Forgot passcode screen', () => {
  it('login shows the link; it opens the screen with the nickname prefilled', async () => {
    await openForgot();
    expect(screen.getByText('Forgot passcode?', { selector: 'h3' })).toBeTruthy();
    expect((id('forgot-nickname') as HTMLInputElement).value).toBe('Mi mi U');
  });

  it('with a hint: shows it, three options, support link is the existing contact', async () => {
    h.hint.mockResolvedValue('my first pet');
    await openForgot();
    await ask();
    expect(h.hint).toHaveBeenCalledWith('Mi mi U');
    expect(id('forgot-hint-result').textContent).toBe('Your hint: my first pet');
    expect(id('forgot-try-again')).toBeTruthy();
    expect(id('forgot-contact-support').getAttribute('href')).toMatch(new RegExp(`^mailto:${SUPPORT_EMAIL}\\?`));
    expect(id('forgot-result').textContent).toMatch(/can't be recovered automatically yet/);
  });

  it('without a hint, and for an unknown nickname (same null answer): same message', async () => {
    h.hint.mockResolvedValue(null);
    await openForgot('Ghost User');
    await ask();
    expect(id('forgot-hint-result').textContent).toBe('No hint was set for this nickname.');
    expect(id('forgot-try-again')).toBeTruthy();
    expect(id('forgot-contact-support')).toBeTruthy();
  });

  it('renders the hint as plain text (escaped)', async () => {
    h.hint.mockResolvedValue('<img src=x onerror=alert(1)><b>hi</b>');
    await openForgot();
    await ask();
    const box = id('forgot-hint-result');
    expect(box.querySelector('img')).toBeNull();
    expect(box.querySelector('b')).toBeNull();
    expect(id('forgot-hint-text').textContent).toBe('<img src=x onerror=alert(1)><b>hi</b>');
  });

  it('"Try logging in again" returns to sign-in with the nickname prefilled', async () => {
    h.hint.mockResolvedValue('x y');
    await openForgot('Back Again');
    await ask();
    await click(id('forgot-try-again'));
    expect(screen.getByText('Access your vocabulary')).toBeTruthy();
    expect((screen.getByPlaceholderText('e.g., Mi mi U') as HTMLInputElement).value).toBe('Back Again');
  });

  it('validates the nickname and shows a friendly error when offline', async () => {
    await openForgot('ab');
    await ask();
    expect(id('forgot-error').textContent).toMatch(/at least 3/);
    expect(h.hint).not.toHaveBeenCalled();
    fireEvent.change(id('forgot-nickname'), { target: { value: 'Valid Name' } });
    h.hint.mockRejectedValue(new Error('Failed to fetch'));
    await ask();
    expect(id('forgot-error').textContent).toMatch(/Can't reach the server/);
  });
});

describe('[FB-77] hint at sign-up', () => {
  async function toCreate() {
    render(<AuthGate />);
    await click(screen.getByRole('button', { name: 'Create a new profile' }));
  }
  const fill = (nick: string, pass: string, hint?: string) => {
    fireEvent.change(screen.getByPlaceholderText('e.g., Mi mi U'), { target: { value: nick } });
    fireEvent.change(screen.getByPlaceholderText('Enter passcode'), { target: { value: pass } });
    if (hint !== undefined) fireEvent.change(id('signup-hint-input'), { target: { value: hint } });
  };

  it('shows the optional field, max 60 and the warning, only when creating', async () => {
    render(<AuthGate />);
    expect(screen.queryByTestId('signup-hint-input')).toBeNull();
    await click(screen.getByRole('button', { name: 'Create a new profile' }));
    expect(screen.getByLabelText('Passcode hint (optional)')).toBeTruthy();
    expect(id('signup-hint-input').getAttribute('maxlength')).toBe('60');
    expect(id('signup-hint-warning').textContent).toBe("Anyone with your nickname can see this hint. Don't write the passcode itself.");
  });

  it('rejects a hint that contains the passcode without calling the server', async () => {
    await toCreate();
    fill('Fresh User', '246810', 'it is 24 68-10');
    await click(screen.getByRole('button', { name: 'Create profile' }));
    expect(screen.getByText(/can't contain your passcode/)).toBeTruthy();
    expect(h.create).not.toHaveBeenCalled();
  });

  it('sends the trimmed hint; an empty hint keeps the two-argument call', async () => {
    h.create.mockResolvedValue({ nickname: 'Fresh User' });
    h.exchange.mockRejectedValue(new Error('stop'));
    await toCreate();
    fill('Fresh User', '246810', '  my dog  ');
    await click(screen.getByRole('button', { name: 'Create profile' }));
    await waitFor(() => expect(h.create).toHaveBeenCalledWith('Fresh User', '246810', 'my dog'));
    cleanup(); h.create.mockClear();
    await toCreate();
    fill('Fresh User', '246810', '   ');
    await click(screen.getByRole('button', { name: 'Create profile' }));
    await waitFor(() => expect(h.create).toHaveBeenCalledWith('Fresh User', '246810'));
  });
});
