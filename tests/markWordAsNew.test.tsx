/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarkAsNewDialog } from '@/components/MarkAsNewDialog';
import { learningProgressService } from '@/services/learningProgressService';

// make expect available for jest-dom extensions
(globalThis as unknown as { expect: typeof expect }).expect = expect;

beforeEach(async () => {
  await import('@testing-library/jest-dom');
  localStorage.clear();
});

describe('Mark as New flow', () => {
  it('opens dialog and resets word to new state', async () => {
    const today = new Date().toISOString().split('T')[0];
    const learnedProgress = {
      word: 'apple',
      category: 'test',
      isLearned: true,
      reviewCount: 3,
      lastPlayedDate: today,
      status: 'learned' as const,
      nextReviewDate: '2099-01-01',
      createdDate: today,
      learnedDate: today,
      nextAllowedTime: new Date().toISOString(),
    };
    localStorage.setItem('learningProgress', JSON.stringify({ apple: learnedProgress }));

    const TestComponent = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button aria-label="Mark as New" onClick={() => setOpen(true)}>
            reset
          </button>
          <MarkAsNewDialog
            isOpen={open}
            onClose={() => setOpen(false)}
            onConfirm={() => {
              learningProgressService.markWordAsNew('apple');
              setOpen(false);
            }}
            word="apple"
          />
        </>
      );
    };

    render(<TestComponent />);

    await userEvent.click(screen.getByRole('button', { name: 'Mark as New' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as New' }));

    const progress = learningProgressService.getWordProgress('apple');
    expect(progress?.isLearned).toBe(false);
    expect(progress?.status).toBe('new');
    expect(progress?.reviewCount).toBe(0);
  });
});
