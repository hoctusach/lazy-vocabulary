/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// Never touch the live Supabase: the client is fully mocked.
const rpc = vi.fn();
vi.mock('@/lib/supabaseClient', () => ({ getSupabaseClient: () => ({ rpc }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import DeleteAccountDialog from '@/components/mobile/DeleteAccountDialog';
import PrivacyAndAccountCard from '@/components/mobile/PrivacyAndAccountCard';
import { NICKNAME_LS_KEY } from '@/lib/nickname';
import { PASSCODE_STORAGE_KEY } from '@/lib/auth';

const SET_KEY = 'lv.vocabularySets.v1';

function seed() {
  localStorage.setItem(NICKNAME_LS_KEY, 'Alice');
  localStorage.setItem(PASSCODE_STORAGE_KEY, '1234');
  localStorage.setItem(SET_KEY, '{"sets":[]}');
}

function renderDialog(onOpenChange = vi.fn()) {
  render(<DeleteAccountDialog open onOpenChange={onOpenChange} nickname="Alice" />);
  return onOpenChange;
}

function fill(nick: string, pass: string) {
  const [nickInput, passInput] = Array.from(document.querySelectorAll('input:not([type=checkbox])')) as HTMLInputElement[];
  fireEvent.change(nickInput, { target: { value: nick } });
  fireEvent.change(passInput, { target: { value: pass } });
}

const confirmBtn = () => screen.getByRole('button', { name: /delete permanently/i });

afterEach(cleanup);
beforeEach(() => {
  rpc.mockReset();
  localStorage.clear();
  seed();
});

describe('ACCT-DEL-01 delete account entry', () => {
  it('shows Delete account and the privacy links when signed in', () => {
    render(<PrivacyAndAccountCard />);
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();
    const privacy = screen.getByRole('link', { name: /privacy policy/i });
    expect(privacy).toHaveAttribute('href', expect.stringContaining('privacy'));
    expect(screen.getByRole('link', { name: /how to delete your account/i })).toBeInTheDocument();
  });

  it('hides the Delete account button when signed out', () => {
    localStorage.clear();
    render(<PrivacyAndAccountCard />);
    expect(screen.queryByRole('button', { name: 'Delete account' })).toBeNull();
  });
});

describe('ACCT-DEL-02 confirm gate / cancel', () => {
  it('keeps confirm disabled until nickname and passcode are typed; no request', () => {
    renderDialog();
    expect(confirmBtn()).toBeDisabled();
    fill('Bob', '1234');
    expect(confirmBtn()).toBeDisabled();
    fill('Alice', '12');
    expect(confirmBtn()).toBeDisabled();
    fireEvent.click(confirmBtn());
    expect(rpc).not.toHaveBeenCalled();
    fill('alice', '1234');
    expect(confirmBtn()).toBeEnabled();
  });

  it('Cancel closes without any request or data change', () => {
    const onOpenChange = renderDialog();
    fill('Alice', '1234');
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(rpc).not.toHaveBeenCalled();
    expect(localStorage.getItem(NICKNAME_LS_KEY)).toBe('Alice');
  });
});

describe('ACCT-DEL-03 backend function missing', () => {
  it.each([
    ['PGRST202 / 404', { code: 'PGRST202', message: 'Could not find the function public.delete_my_account(p_nickname, p_passcode) in the schema cache' }],
    ['42883', { code: '42883', message: 'function delete_my_account does not exist' }],
  ])('%s shows a friendly error, stays signed in, keeps local data', async (_n, error) => {
    rpc.mockResolvedValue({ data: null, error });
    const onOpenChange = renderDialog();
    fill('Alice', '1234');
    fireEvent.click(confirmBtn());
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/not available yet/i);
    expect(alert.textContent).not.toMatch(/PGRST|schema cache|public\.delete_my_account/);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(localStorage.getItem(NICKNAME_LS_KEY)).toBe('Alice');
    expect(localStorage.getItem(PASSCODE_STORAGE_KEY)).toBe('1234');
    expect(localStorage.getItem(SET_KEY)).toBe('{"sets":[]}');
    await waitFor(() => expect(confirmBtn()).toBeEnabled());
  });

  it('a thrown non-Error also yields a friendly message', async () => {
    rpc.mockRejectedValue({ weird: true });
    renderDialog();
    fill('Alice', '1234');
    fireEvent.click(confirmBtn());
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/something went wrong/i);
    expect(localStorage.getItem(NICKNAME_LS_KEY)).toBe('Alice');
  });
});

describe('ACCT-DEL-04 offline', () => {
  it('shows a friendly offline error and clears nothing', async () => {
    rpc.mockRejectedValue(new TypeError('Failed to fetch'));
    renderDialog();
    fill('Alice', '1234');
    fireEvent.click(confirmBtn());
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/could not reach the server/i);
    expect(alert.textContent).not.toMatch(/TypeError|fetch/);
    expect(localStorage.getItem(NICKNAME_LS_KEY)).toBe('Alice');
    expect(localStorage.getItem(PASSCODE_STORAGE_KEY)).toBe('1234');
    expect(localStorage.getItem(SET_KEY)).toBe('{"sets":[]}');
  });
});

describe('ACCT-DEL-05 success', () => {
  it('clears local account keys, signs out, closes and reloads', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload } });
    try {
      rpc.mockResolvedValue({ data: null, error: null });
      const onOpenChange = renderDialog();
      fill('Alice', '1234');
      fireEvent.click(confirmBtn());
      await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
      expect(rpc).toHaveBeenCalledWith('delete_my_account', { p_nickname: 'Alice', p_passcode: 1234 });
      expect(localStorage.getItem(NICKNAME_LS_KEY)).toBeNull();
      expect(localStorage.getItem(PASSCODE_STORAGE_KEY)).toBeNull();
      // imported sets are device-only and kept unless the checkbox is ticked
      expect(localStorage.getItem(SET_KEY)).toBe('{"sets":[]}');
      vi.advanceTimersByTime(500);
      expect(reload).toHaveBeenCalled(); // app re-mounts -> AuthGate
    } finally {
      vi.useRealTimers();
      Object.defineProperty(window, 'location', { configurable: true, value: original });
    }
  });
});
