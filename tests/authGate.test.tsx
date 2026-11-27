/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { validateDisplayName } from '@/lib/nickname';
import {
  friendlyAuthMessage,
  validatePasscode,
  OFFLINE_MESSAGE,
  SERVER_BUSY_MESSAGE,
} from '@/lib/auth/authMessages';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), warning: vi.fn() }) }));
vi.mock('@/utils/speech', () => ({ initializeSpeechSystem: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/services/analyticsService', () => ({ identifyUser: vi.fn() }));
vi.mock('@/lib/progress/srsSyncByUserKey', () => ({ ensureUserKey: vi.fn().mockResolvedValue(null) }));

describe('AUTH-03: nickname blocked characters', () => {
  for (const ch of ['<', '>', '"', "'", '`', '$', '\\', '{', '}', '|', ';']) {
    it(`rejects ${JSON.stringify(ch)}`, () => {
      expect(validateDisplayName(`ab${ch}c`)).toBe('Nickname contains blocked characters.');
    });
  }
  it('accepts spaces, emoji and Vietnamese', () => {
    expect(validateDisplayName('Mi mi U')).toBeNull();
    expect(validateDisplayName('Đà Nẵng 🚀')).toBeNull();
  });
});

describe('AUTH-04: passcode validation', () => {
  it('rejects too short', () => expect(validatePasscode('123')).toBe('Passcode must be at least 4 digits.'));
  it('rejects empty', () => expect(validatePasscode('')).toBe('Passcode must be at least 4 digits.'));
  it('rejects too long', () => expect(validatePasscode('12345678901')).toBe('Passcode must be at most 10 digits.'));
  it('rejects letters', () => expect(validatePasscode('12ab')).toBe('Passcode can only contain numbers.'));
  it('rejects inner spaces', () => expect(validatePasscode('12 34')).toBe('Passcode can only contain numbers.'));
  it('accepts 4 and 10 digits', () => {
    expect(validatePasscode('1234')).toBeNull();
    expect(validatePasscode('1234567890')).toBeNull();
  });
});

describe('[FB-19] AUTH-05: friendly sign-in errors', () => {
  it('maps "Failed to fetch" to the offline message', () => {
    expect(friendlyAuthMessage(new TypeError('Failed to fetch'), 'Sign-in failed')).toBe(OFFLINE_MESSAGE);
    expect(friendlyAuthMessage(new TypeError('Load failed'), 'x')).toBe(OFFLINE_MESSAGE);
    expect(friendlyAuthMessage(new TypeError('NetworkError when attempting to fetch resource.'), 'x')).toBe(OFFLINE_MESSAGE);
  });
  it('maps 5xx and bare HTTP codes to the server message', () => {
    expect(friendlyAuthMessage(Object.assign(new Error('boom'), { status: 503 }), 'x')).toBe(SERVER_BUSY_MESSAGE);
    expect(friendlyAuthMessage(new Error('HTTP 502'), 'x')).toBe(SERVER_BUSY_MESSAGE);
  });
  it('keeps meaningful server messages and falls back when empty', () => {
    expect(friendlyAuthMessage(new Error('That nickname is reserved'), 'x')).toBe('That nickname is reserved');
    expect(friendlyAuthMessage({}, 'Sign-in failed')).toBe('Sign-in failed');
    expect(friendlyAuthMessage(null, 'Sign-in failed')).toBe('Sign-in failed');
  });
});

describe('AuthGate component', () => {
  const realFetch = globalThis.fetch;
  beforeEach(async () => {
    (globalThis as unknown as { expect: typeof expect }).expect = expect;
    await import('@testing-library/jest-dom');
    localStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  async function openGate() {
    const { default: AuthGate } = await import('@/components/AuthGate');
    render(<AuthGate />);
    await screen.findByText('Access your vocabulary');
  }

  it('[FB-19] AUTH-05: shows a friendly message when the network call fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await openGate();
    fireEvent.change(screen.getByPlaceholderText('e.g., Mi mi U'), { target: { value: 'Tester' } });
    fireEvent.change(screen.getByPlaceholderText('Enter passcode'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByText(OFFLINE_MESSAGE)).toBeInTheDocument());
    expect(screen.queryByText(/Failed to fetch/)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('AUTH-03/04: invalid input never reaches the network', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await openGate();
    fireEvent.change(screen.getByPlaceholderText('e.g., Mi mi U'), { target: { value: 'ab<c' } });
    fireEvent.change(screen.getByPlaceholderText('Enter passcode'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Nickname contains blocked characters.')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('e.g., Mi mi U'), { target: { value: 'Tester' } });
    fireEvent.change(screen.getByPlaceholderText('Enter passcode'), { target: { value: '12ab' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Passcode can only contain numbers.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('AUTH-06: footer does not point to a Settings screen that does not exist', async () => {
    await openGate();
    expect(screen.queryByText(/Settings/)).toBeNull();
    expect(screen.getByText(/remembered on this device/)).toBeInTheDocument();
  });
});
