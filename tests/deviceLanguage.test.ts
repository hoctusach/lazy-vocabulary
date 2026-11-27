/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { getPrimaryDeviceLanguage, isVietnameseDevice, useIsVietnameseDevice } from '@/utils/deviceLanguage';

function setLocale(languages: string[] | undefined, language = '') {
  Object.defineProperty(navigator, 'languages', { value: languages, configurable: true });
  Object.defineProperty(navigator, 'language', { value: language, configurable: true });
}

describe('deviceLanguage', () => {
  afterEach(() => setLocale(['en-US'], 'en-US'));

  it('detects Vietnamese', () => {
    setLocale(['vi-VN'], 'vi-VN'); expect(isVietnameseDevice()).toBe(true);
    setLocale(['vi'], 'vi'); expect(isVietnameseDevice()).toBe(true);
  });
  it('rejects other languages', () => {
    setLocale(['en-US'], 'en-US'); expect(isVietnameseDevice()).toBe(false);
    setLocale(['ko-KR'], 'ko-KR'); expect(isVietnameseDevice()).toBe(false);
  });
  it('languages[0] wins over language; falls back to language', () => {
    setLocale(['en-US', 'vi'], 'vi-VN'); expect(getPrimaryDeviceLanguage()).toBe('en-US'); expect(isVietnameseDevice()).toBe(false);
    setLocale([], 'vi-VN'); expect(isVietnameseDevice()).toBe(true);
  });
  it('hook updates on languagechange', () => {
    setLocale(['en-US'], 'en-US');
    const { result } = renderHook(() => useIsVietnameseDevice());
    expect(result.current).toBe(false);
    act(() => { setLocale(['vi-VN'], 'vi-VN'); window.dispatchEvent(new Event('languagechange')); });
    expect(result.current).toBe(true);
  });
});
