// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkAsLearnedDialog } from '@/components/MarkAsLearnedDialog';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { showCongratsEffect } from '@/lib/utils/congratsEffect';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

describe('theme-consistent popups', () => {
  it('Mark as Learned dialog uses the shared themed surface and buttons (no hard-coded palette)', () => {
    render(<MarkAsLearnedDialog isOpen onClose={() => {}} onConfirm={() => {}} word="resilient" />);
    const dlg = screen.getByRole('alertdialog');
    expect(dlg.className).toContain('lv-popup');
    const confirm = screen.getByRole('button', { name: 'Mark as Learned' });
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(confirm.className).toContain('lv-btn-primary');
    expect(cancel.className).toContain('lv-btn-secondary');
    for (const b of [confirm, cancel]) expect(b.className).not.toMatch(/indigo|slate-|dark:bg-/);
  });

  it('Dialog and Popover content carry the theme hooks', () => {
    render(
      <>
        <Dialog open>
          <DialogContent>
            <DialogTitle>T</DialogTitle>
            <DialogDescription>D</DialogDescription>
          </DialogContent>
        </Dialog>
        <Popover open>
          <PopoverTrigger>x</PopoverTrigger>
          <PopoverContent>hello</PopoverContent>
        </Popover>
      </>
    );
    expect(screen.getByRole('dialog').className).toContain('lv-popup');
    expect(screen.getByText('hello').className).toContain('lv-pop');
  });

  it('celebration popup is styled by the theme stylesheet, not inline colours', () => {
    (window as unknown as { Audio: unknown }).Audio = class { volume = 1; play() { return Promise.resolve(); } };
    showCongratsEffect();
    const el = document.querySelector('.lv-congrats') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.style.background).toBe('');
    expect(el.style.color).toBe('');
    el.remove();
  });
});
