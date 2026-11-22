// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import SrsTipCard from '../SrsTipCard';

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('[FB-11] SrsTipCard', () => {
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
  it('first day: intro starts expanded, Why? collapses it', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US']);
    render(<SrsTipCard total={3000} due={0} />);
    expect(localStorage.getItem('lv.srsTip.firstSeenOn')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(screen.getByTestId('srs-tip-body')).toBeTruthy();
    fireEvent.click(screen.getByText('Why?'));
    expect(screen.queryByTestId('srs-tip-body')).toBeNull();
  });
  it('after the first day: collapsed to title + Why?, even if expanded yesterday', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US']);
    const d = new Date(Date.now() - 86400000);
    const y = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    localStorage.setItem('lv.srsTip.firstSeenOn', y);
    const { unmount } = render(<SrsTipCard total={3000} due={0} />);
    expect(screen.getByText('20 words a day. Never forget them.')).toBeTruthy();
    expect(screen.queryByTestId('srs-tip-body')).toBeNull();
    expect(screen.queryByText(/20 words\/day/)).toBeNull();
    fireEvent.click(screen.getByText('Why?'));
    expect(screen.getByTestId('srs-tip-body')).toBeTruthy();
    expect(screen.getByText(/20 words\/day/)).toBeTruthy();
    unmount();
    render(<SrsTipCard total={3000} due={0} />);
    expect(screen.queryByTestId('srs-tip-body')).toBeNull();
  });
  it('Vietnamese uses Vì sao?', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['vi-VN']);
    localStorage.setItem('lv.srsTip.firstSeenOn', '2000-01-01');
    render(<SrsTipCard total={3000} due={0} />);
    expect(screen.getByText('Vì sao?')).toBeTruthy();
  });
  it('shows the due variant in Vietnamese', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['vi-VN']);
    render(<SrsTipCard total={3000} due={4} />);
    expect(screen.getByText('4 từ sắp bị quên. 3 phút để giữ lại.')).toBeTruthy();
  });
});
