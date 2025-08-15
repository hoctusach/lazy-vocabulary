import { describe, it, expect } from 'vitest';
import { calculateHighestStreak, ActivityDay } from '../src/utils/calculateHighestStreak';

describe('calculateHighestStreak', () => {
  it('calculates longest streak from unordered input', () => {
    const data: ActivityDay[] = [
      { date: '2024-07-03', isRedeemed: false },
      { date: '2024-07-01', isRedeemed: false },
      { date: '2024-07-02', isRedeemed: false }
    ];
    const result = calculateHighestStreak(data);
    expect(result).toEqual({
      highestStreak: 3,
      streakDates: ['2024-07-01', '2024-07-02', '2024-07-03']
    });
  });

  it('resets streak on redemption or date gap', () => {
    const data: ActivityDay[] = [
      { date: '2024-07-01', isRedeemed: false },
      { date: '2024-07-02', isRedeemed: true },
      { date: '2024-07-03', isRedeemed: false },
      { date: '2024-07-04', isRedeemed: false },
      { date: '2024-07-06', isRedeemed: false }
    ];
    const result = calculateHighestStreak(data);
    expect(result).toEqual({
      highestStreak: 2,
      streakDates: ['2024-07-03', '2024-07-04']
    });
  });

  it('returns earliest streak when multiple are equal length', () => {
    const data: ActivityDay[] = [
      { date: '2024-07-05', isRedeemed: false },
      { date: '2024-07-06', isRedeemed: false },
      { date: '2024-07-01', isRedeemed: false },
      { date: '2024-07-02', isRedeemed: false }
    ];
    const result = calculateHighestStreak(data);
    expect(result).toEqual({
      highestStreak: 2,
      streakDates: ['2024-07-01', '2024-07-02']
    });
  });
});
