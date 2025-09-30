/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { LearningProgressPanel } from '@/components/LearningProgressPanel';
import { TooltipProvider } from '@/components/ui/tooltip';

describe('LearningProgressPanel', () => {
  it('renders learned stat', () => {
    const progressStats = { total: 10, learning: 5, new: 3, due: 2, learned: 4 };

    render(
      <TooltipProvider>
        <LearningProgressPanel
          progressStats={progressStats}
          learnerId="test"
        />
      </TooltipProvider>
    );

    const triggers = screen.getAllByRole('button', { name: 'Learning Progress' });
    fireEvent.click(triggers[0]);
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
        />
      </TooltipProvider>
    );

    const triggers = screen.getAllByRole('button', { name: 'Learning Progress' });
    await user.click(triggers[0]);
    await user.click(triggers[1]);
    const dueTrigger = (await screen.findAllByRole('button', { name: /due review count/i }))[0];
    await user.click(dueTrigger);

    const tooltipTexts = await screen.findAllByText(/Each correct review pushes the next one farther out/i);
    expect(tooltipTexts.length).toBeGreaterThan(0);
  });
});
