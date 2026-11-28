/**
 * @vitest-environment jsdom
 * [FB-79] A signed-in user can edit or clear the passcode hint in Settings (More tab).
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ fetch: vi.fn(), update: vi.fn(), token: 'tok' as string | null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/edgeApi', () => ({ fetchPasscodeHint: (...a: unknown[]) => h.fetch(...a), updatePasscodeHint: (...a: unknown[]) => h.update(...a) }));
vi.mock('@/lib/customAuth', () => ({ getSession: () => (h.token ? { session_token: h.token } : null) }));
vi.mock('@/lib/auth', () => ({ getStoredPasscode: () => '123456' }));

import PasscodeHintCard from '@/components/mobile/PasscodeHintCard';

beforeEach(() => {
  localStorage.setItem('lazyVoca.nickname', 'Mi mi U');
  h.token = 'tok';
  h.fetch.mockReset().mockResolvedValue('old hint');
  h.update.mockReset().mockResolvedValue({ ok: true });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => { cleanup(); localStorage.clear(); });

const input = () => screen.getByTestId('settings-hint-input') as HTMLInputElement;

describe('[FB-79] Settings passcode hint row', () => {
  it('loads the current hint, saves a new one with the session token', async () => {
    render(<PasscodeHintCard />);
    await waitFor(() => expect(input().value).toBe('old hint'));
    fireEvent.change(input(), { target: { value: ' new hint ' } });
    await act(async () => { fireEvent.click(screen.getByTestId('settings-hint-save')); });
    expect(h.update).toHaveBeenCalledWith('new hint', 'tok');
  });

  it('clears the hint', async () => {
    render(<PasscodeHintCard />);
    await waitFor(() => expect(input().value).toBe('old hint'));
    await act(async () => { fireEvent.click(screen.getByTestId('settings-hint-clear')); });
    expect(h.update).toHaveBeenCalledWith(null, 'tok');
    expect(input().value).toBe('');
  });

  it('refuses a hint containing the passcode (no request)', async () => {
    render(<PasscodeHintCard />);
    await waitFor(() => expect(input().value).toBe('old hint'));
    fireEvent.change(input(), { target: { value: '12-34 56' } });
    await act(async () => { fireEvent.click(screen.getByTestId('settings-hint-save')); });
    expect(screen.getByRole('alert').textContent).toMatch(/can't contain your passcode/);
    expect(h.update).not.toHaveBeenCalled();
  });

  it('renders nothing when signed out', () => {
    localStorage.clear();
    const { container } = render(<PasscodeHintCard />);
    expect(container.innerHTML).toBe('');
  });
});
