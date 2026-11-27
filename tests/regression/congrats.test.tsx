// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { existsSync, readFileSync } from 'node:fs';
import { MemoryRouter } from 'react-router-dom';

vi.mock('sonner', () => ({ toast: vi.fn(), warning: vi.fn() }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('@/hooks/useSpeechRate', () => ({ useSpeechRate: () => ({ speechRate: 1, setSpeechRate: vi.fn() }) }));
vi.mock('@/hooks/useVoiceContext', () => ({ useVoiceContext: () => ({ allVoices: [] }) }));

import { congratsSoundUrl, showCongratsEffect } from '@/lib/utils/congratsEffect';
import VocabularyControlsColumn from '@/components/vocabulary-app/VocabularyControlsColumn';

describe('[FB-47] congrats sound path is base-aware (web and Capacitor bundle)', () => {
  it('resolves relative to the packaged bundle, never to the filesystem/origin root', () => {
    expect(congratsSoundUrl(1, './', 'https://localhost/index.html')).toBe('https://localhost/songs/sound1.mp3');
    expect(congratsSoundUrl(2, './', 'file:///android_asset/public/index.html')).toBe('file:///android_asset/public/songs/sound2.mp3');
    expect(congratsSoundUrl(3, '/', 'https://site.test/index.html')).toBe('https://site.test/songs/sound3.mp3');
    expect(congratsSoundUrl(3, '/app/', 'https://site.test/app/')).toBe('https://site.test/app/songs/sound3.mp3');
  });
  it('the three files exist in public/ (copied into capacitor-www by the build)', () => {
    for (const n of [1, 2, 3]) expect(existsSync(`public/songs/sound${n}.mp3`)).toBe(true);
  });
  it('source has no root-absolute "/songs/" string', () => {
    expect(readFileSync('src/lib/utils/congratsEffect.ts', 'utf8')).not.toMatch(/["'`]\/songs\//);
  });
  it('does not wait for the server sync: srsSyncByUserKey no longer triggers it', () => {
    expect(readFileSync('src/lib/progress/srsSyncByUserKey.ts', 'utf8')).not.toMatch(/showCongratsEffect/);
  });
});

describe('[FB-47] popup + sound fire on the tap', () => {
  const played: string[] = [];
  beforeEach(() => {
    played.length = 0;
    (window as unknown as { Audio: unknown }).Audio = class { src: string; volume = 1; constructor(src: string) { this.src = src; } play() { played.push(this.src); return Promise.resolve(); } };
  });
  afterEach(() => { cleanup(); document.querySelectorAll('.lv-congrats').forEach((e) => e.remove()); });

  it('popup is created at once, above everything, with a sound request', () => {
    showCongratsEffect();
    const el = document.querySelector('.lv-congrats') as HTMLElement;
    expect(el).toBeTruthy();
    expect(Number(el.style.zIndex)).toBeGreaterThan(9999);
    expect(el.style.pointerEvents).toBe('none');
    expect(played).toHaveLength(1);
    expect(played[0]).toMatch(/\/songs\/sound[123]\.mp3$/);
  });

  it('a throwing Audio or rejecting play() cannot stop the popup', () => {
    (window as unknown as { Audio: unknown }).Audio = class { constructor() { throw new Error('no audio'); } };
    expect(() => showCongratsEffect()).not.toThrow();
    expect(document.querySelector('.lv-congrats')).toBeTruthy();
    document.querySelectorAll('.lv-congrats').forEach((e) => e.remove());
    (window as unknown as { Audio: unknown }).Audio = class { volume = 1; play() { return Promise.reject(new Error('blocked')); } };
    expect(() => showCongratsEffect()).not.toThrow();
    expect(document.querySelector('.lv-congrats')).toBeTruthy();
  });

  it('confirming Mark as Learned shows the popup immediately even if marking never resolves (slow sync)', async () => {
    const onMark = vi.fn(() => new Promise(() => {})); // never settles
    render(
      <MemoryRouter>
        <VocabularyControlsColumn isMuted={false} isPaused={false} onToggleMute={() => {}} onTogglePause={() => {}} onNextWord={() => {}}
          currentWord={{ word: 'apple', meaning: 'm', example: 'e', category: 'test', count: 0 }} selectedVoiceName="v"
          playCurrentWord={() => {}} onMarkWordLearned={onMark as never} onOpenSearch={() => {}} />
      </MemoryRouter>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Mark as Learned' }));
    expect(document.querySelector('.lv-congrats')).toBeNull();
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Mark as Learned' }));
    expect(document.querySelector('.lv-congrats')).toBeTruthy();
    expect(played).toHaveLength(1);
    expect(onMark).toHaveBeenCalled();
  });
});
