/**
 * @vitest-environment jsdom
 * EDGE-08: blocked localStorage must not crash the ThemeProvider.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/contexts/ThemeContext';

afterEach(() => vi.restoreAllMocks());

describe('ThemeProvider with blocked storage', () => {
  it('renders its children when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError'); });
    if (!window.matchMedia) window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never;
    render(<ThemeProvider><p>still here</p></ThemeProvider>);
    expect(screen.getByText('still here')).toBeTruthy();
  });
});
