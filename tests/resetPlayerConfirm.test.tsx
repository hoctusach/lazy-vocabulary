/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const resetPlayerData = vi.fn();
vi.mock('@/lib/cleanup/resetPlayerData', () => ({ resetPlayerData: () => resetPlayerData() }));
vi.mock('@/lib/auth', () => ({
  clearStoredAuth: vi.fn(),
  getActiveSession: vi.fn().mockResolvedValue(null),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));

import UserGreeting from '@/components/UserGreeting';

describe('Reset player confirmation', () => {
  beforeEach(async () => {
    (globalThis as unknown as { expect: typeof expect }).expect = expect;
    await import('@testing-library/jest-dom');
    localStorage.clear();
    localStorage.setItem('lazyVoca.nickname', 'Tester');
    resetPlayerData.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {}); // jsdom: reload() not implemented
  });
  afterEach(() => cleanup());

  it('ACCT-RESET-01: tapping Reset player only asks; nothing is cleared yet', async () => {
    render(<UserGreeting />);
    fireEvent.click(await screen.findByText('Reset player'));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Reset player?')).toBeInTheDocument();
    expect(resetPlayerData).not.toHaveBeenCalled();
  });

  it('ACCT-RESET-02: Cancel closes the dialog and clears nothing', async () => {
    render(<UserGreeting />);
    fireEvent.click(await screen.findByText('Reset player'));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(resetPlayerData).not.toHaveBeenCalled();
  });

  it('ACCT-RESET-03: confirming runs the reset', async () => {
    render(<UserGreeting />);
    fireEvent.click(await screen.findByText('Reset player'));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reset player' }));
    await waitFor(() => expect(resetPlayerData).toHaveBeenCalledTimes(1));
  });
});
