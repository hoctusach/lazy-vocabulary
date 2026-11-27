// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import NotificationManager from '../NotificationManager';

const setNotification = (permission: string | null) => {
  if (permission === null) delete (window as unknown as Record<string, unknown>).Notification;
  else (window as unknown as Record<string, unknown>).Notification = Object.assign(function () {}, { permission, requestPermission: async () => permission });
};

afterEach(() => { cleanup(); delete (window as unknown as Record<string, unknown>).Notification; });

describe('[FB-13] NotificationManager (web reminders toggle)', () => {
  it('shows a visible "Reminders: off" label when permission is not granted', () => {
    setNotification('default');
    render(<NotificationManager />);
    const b = screen.getByRole('button');
    expect(b.textContent).toBe('Reminders: off');
    expect(b.getAttribute('aria-pressed')).toBe('false');
    expect(b.getAttribute('aria-label')).toMatch(/reminder/i);
    expect(b.className).not.toContain('w-11');
  });
  it('shows "Reminders: on" when granted', () => {
    setNotification('granted');
    render(<NotificationManager />);
    const b = screen.getByRole('button');
    expect(b.textContent).toBe('Reminders: on');
    expect(b.getAttribute('aria-pressed')).toBe('true');
  });
  it('renders nothing when Notification is unsupported', () => {
    setNotification(null);
    const { container } = render(<NotificationManager />);
    expect(container.firstChild).toBeNull();
  });
});
