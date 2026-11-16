// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { Toaster, toast } from '@/components/ui/sonner';
import { CONTROL_TOAST } from '../controlToast';

describe('control toasts', () => {
  window.matchMedia = window.matchMedia || ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false, onchange: null }) as unknown as MediaQueryList);
  it('30 rapid taps leave a single toast, and distinct toasts are capped', async () => {
    const { container } = render(<Toaster />);
    await act(async () => {
      for (let i = 0; i < 30; i++) toast(i % 2 ? 'Audio muted' : 'Playback paused', CONTROL_TOAST);
    });
    await waitFor(() => expect(document.querySelectorAll('[data-sonner-toast]').length).toBe(1));
    await act(async () => { for (let i = 0; i < 10; i++) toast('other ' + i); });
    await waitFor(() => expect(document.querySelectorAll('[data-sonner-toast]').length).toBeGreaterThan(1));
    expect(document.querySelectorAll('[data-sonner-toast][data-visible="true"]').length).toBeLessThanOrEqual(3);
    void container;
  });
});
