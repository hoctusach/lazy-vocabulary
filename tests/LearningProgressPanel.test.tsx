/**
 * @vitest-environment jsdom
 */
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, it, expect } from 'vitest';
import { LearningProgressPanel } from '@/components/LearningProgressPanel';
import { TooltipProvider } from '@/components/ui/tooltip';

describe('LearningProgressPanel', () => {
  afterEach(cleanup);
  it('[FB-39] is expanded by default', () => {
    render(
      <TooltipProvider>
        <LearningProgressPanel progressStats={{ total: 10, learning: 5, new: 3, due: 2, learned: 4 }} learnerId="t" progressError={null} />
      </TooltipProvider>
    );
    expect(screen.getByText('Due Review')).toBeTruthy();
  });

  it('renders learned stat', () => {
    const progressStats = { total: 10, learning: 5, new: 3, due: 2, learned: 4 };

    render(
      <TooltipProvider>
        <LearningProgressPanel
          progressStats={progressStats}
          learnerId="test"
          progressError={null}
        />
      </TooltipProvider>
    );

    // [FB-39] open by default: no click needed
    const learnedLabel = screen.getByText('Learned');
    expect(learnedLabel.previousElementSibling?.textContent).toBe('4');
  });

  it('shows review schedule tooltip when interacting with due review count', async () => {
    const progressStats = { total: 10, learning: 5, new: 3, due: 2, learned: 4 };
    const user = userEvent.setup();

    render(
      <TooltipProvider>
        <LearningProgressPanel
          progressStats={progressStats}
          learnerId="test"
          progressError={null}
        />
      </TooltipProvider>
    );

    const dueTrigger = (await screen.findAllByRole('button', { name: /due review count/i }))[0];
    await user.click(dueTrigger);

    const tooltipTexts = await screen.findAllByText(/Each correct review pushes the next one farther out/i);
    expect(tooltipTexts.length).toBeGreaterThan(0);
  });

  it('renders error notice when progress data is unavailable', async () => {
    const progressStats = { total: 0, learning: 0, new: 0, due: 0, learned: 0 };

    render(
      <TooltipProvider>
        <LearningProgressPanel
          progressStats={progressStats}
          learnerId="test"
          progressError="Progress data unavailable. Please check with your administrator."
        />
      </TooltipProvider>
    );

    const notice = await screen.findByText(/Progress data unavailable\. Please check with your administrator\./i);
    expect(notice).toBeTruthy();
  });
});
