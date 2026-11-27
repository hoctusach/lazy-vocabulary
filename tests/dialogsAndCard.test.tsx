/**
 * @vitest-environment jsdom
 * Dialogs and the word card (G1, G2, G5, G6, G7).
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarkAsLearnedDialog } from '@/components/MarkAsLearnedDialog';
import { MarkAsNewDialog } from '@/components/MarkAsNewDialog';
import VocabularyCardNew from '@/components/vocabulary-app/VocabularyCardNew';
import { getCategoryLabel } from '@/utils/categoryLabels';
import { MASTER_INTERVAL_DAYS } from '@/lib/progress/reviewSchedule';

afterEach(() => cleanup());

describe('Mark as Learned dialog (G6)', () => {
  const setup = (isOpen = true) => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<MarkAsLearnedDialog isOpen={isOpen} onClose={onClose} onConfirm={onConfirm} word="give up" />);
    return { onClose, onConfirm };
  };

  it('is not rendered when closed', () => {
    setup(false);
    expect(screen.queryByText('Mark as Learned', { selector: 'h2' })).toBeNull();
  });

  it('names the word and asks for confirmation', () => {
    setup();
    expect(screen.getByText(/mark "give up" as learned/)).toBeTruthy();
  });

  it('Confirm calls onConfirm once (the dialog also closes itself)', () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Mark as Learned' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('says the word comes back after 60 days, taken from the same constant as the schedule', () => {
    setup();
    expect(document.body.textContent).toMatch(/reappear after 60 days for review/);
    expect(MASTER_INTERVAL_DAYS).toBe(60);
  });

  it('Cancel calls onClose and never onConfirm', () => {
    const { onConfirm, onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('Escape closes it without confirming', () => {
    const { onConfirm, onClose } = setup();
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('a word with quotes or HTML is shown as text', () => {
    render(<MarkAsLearnedDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} word={'<b>x</b>'} />);
    expect(screen.getByText(/<b>x<\/b>/)).toBeTruthy();
    expect(document.querySelector('b')).toBeNull();
  });
});

describe('Mark as New dialog (G7)', () => {
  it('confirms and cancels', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<MarkAsNewDialog isOpen onClose={onClose} onConfirm={onConfirm} word="spare" />);
    expect(screen.getByText(/mark "spare" as new/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mark as New' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('word card (G1, G2, G5)', () => {
  const card = (props: Partial<React.ComponentProps<typeof VocabularyCardNew>> = {}) =>
    render(
      <VocabularyCardNew word="spare" meaning="extra" example="I have a spare key." backgroundColor="white" isSpeaking={false} category="idioms" {...props} />
    );

  it('shows word, meaning, example and the category label', () => {
    card();
    expect(screen.getByText('spare')).toBeTruthy();
    expect(screen.getByText(/extra/)).toBeTruthy();
    expect(screen.getByText(/I have a spare key\./)).toBeTruthy();
    expect(screen.getByText('Idiom')).toBeTruthy();
  });

  it('shows a custom category with a capital letter', () => {
    card({ category: 'my own set' });
    expect(screen.getByText('My own set')).toBeTruthy();
    expect(getCategoryLabel('')).toBe('');
  });

  it('shows annotations next to the word in small text', () => {
    card({ word: 'give up (phr v)' });
    expect(screen.getByText('give up')).toBeTruthy();
    expect(screen.getByText('(phr v)')).toBeTruthy();
  });

  it('shows the translation only when there is one', () => {
    const { unmount } = card({ translation: 'bỏ cuộc' });
    expect(screen.getByText(/bỏ cuộc/)).toBeTruthy();
    unmount();
    card();
    expect(screen.queryByText(/\* bỏ cuộc/)).toBeNull();
  });

  it('keeps line breaks in the meaning and handles very long text without crashing', () => {
    card({ meaning: 'line one\nline two', example: 'x'.repeat(5000) });
    expect(screen.getByText(/line one/)).toBeTruthy();
    expect(document.body.textContent).toContain('x'.repeat(5000));
  });

  it('does not render HTML from the word data', () => {
    card({ meaning: '<img src=x onerror=alert(1)>' });
    expect(document.querySelector('img')).toBeNull();
  });
});
