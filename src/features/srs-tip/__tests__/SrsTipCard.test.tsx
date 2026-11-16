// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SrsTipCard from '../SrsTipCard';

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('SrsTipCard', () => {
  it('shows the intro, dismisses with X and stays hidden on remount', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US']);
    const { unmount } = render(<SrsTipCard total={3000} due={0} />);
    expect(screen.getByText('20 words a day. Never forget them.')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(screen.queryByTestId('srs-tip')).toBeNull();
    unmount();
    render(<SrsTipCard total={3000} due={0} />);
    expect(screen.queryByTestId('srs-tip')).toBeNull();
  });
  it('shows the due variant in Vietnamese', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['vi-VN']);
    render(<SrsTipCard total={3000} due={4} />);
    expect(screen.getByText('4 từ sắp bị quên. 3 phút để giữ lại.')).toBeTruthy();
  });
});
