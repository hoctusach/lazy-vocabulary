/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LearningProgressPanel } from '@/components/LearningProgressPanel';

describe('LearningProgressPanel', () => {
  it('renders learnedCompleted stat', () => {
    const progressStats = { total: 10, learned: 5, new: 3, due: 2, learnedCompleted: 4 };

    render(
      <LearningProgressPanel
        dailySelection={null}
        progressStats={progressStats}
        onGenerateDaily={() => {}}
        learnerId="test"
      />
    );

    fireEvent.click(screen.getByText('Daily Learning Progress'));
    const learnedLabel = screen.getByText('Learned');
    expect(learnedLabel.previousElementSibling?.textContent).toBe('4');
  });
});
