// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const HEART = 'Kokoro Heart (US female)';
const MICHAEL = 'Kokoro Michael (US male)';
const SYSTEM = ['Google US English', 'English United States male', 'en-us-x-iom-local (male)', 'Daniel', 'Microsoft David'];

let listed: { name: string }[] = [];
vi.mock('@/hooks/useSpeechRate', () => ({ useSpeechRate: () => ({ speechRate: 1, setSpeechRate: vi.fn() }) }));
vi.mock('@/hooks/useVoiceContext', () => ({ useVoiceContext: () => ({ allVoices: listed }) }));
vi.mock('@/services/analyticsService', () => ({ trackUiInteraction: vi.fn() }));

describe('[FB-29] system voices are free; only Kokoro Michael is Pro', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_ENABLE_PRO', 'true');
    localStorage.clear();
  });
  afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

  it('isVoiceLocked: false for every system/device voice (even male-sounding), true only for Michael when not Pro', async () => {
    const { isVoiceLocked } = await import('@/services/speech/voiceAccess');
    for (const n of [...SYSTEM, HEART, '', null, undefined]) expect(isVoiceLocked(n as string)).toBe(false);
    expect(isVoiceLocked(MICHAEL)).toBe(true);
    expect(isVoiceLocked('kokoro:am_michael')).toBe(true);
  });

  it('Pro users can use Michael', async () => {
    const ent = await import('@/services/billing/entitlement');
    ent.setProEntitlement();
    const { isVoiceLocked, nextAllowedVoice, lockedProVoiceIn } = await import('@/services/speech/voiceAccess');
    expect(isVoiceLocked(MICHAEL)).toBe(false);
    expect(nextAllowedVoice([HEART, MICHAEL, ...SYSTEM].map((name) => ({ name })), HEART)?.name).toBe(MICHAEL);
    expect(lockedProVoiceIn([{ name: MICHAEL }])).toBeNull();
  });

  it('a free user can cycle through every system voice and never opens the upgrade sheet', async () => {
    const { nextAllowedVoice } = await import('@/services/speech/voiceAccess');
    const { getProUpgradeState } = await import('@/services/billing/proUpgradeStore');
    const voices = [HEART, MICHAEL, ...SYSTEM].map((name) => ({ name }));
    let cur = HEART;
    const seen: string[] = [];
    for (let i = 0; i < voices.length; i++) {
      cur = nextAllowedVoice(voices, cur)!.name;
      seen.push(cur);
    }
    expect(seen).toEqual(expect.arrayContaining([...SYSTEM, HEART]));
    expect(seen).not.toContain(MICHAEL);
    expect(getProUpgradeState().open).toBe(false);
  });

  it('a free user with only system voices (no Kokoro) can cycle too', async () => {
    const { nextAllowedVoice } = await import('@/services/speech/voiceAccess');
    const voices = SYSTEM.map((name) => ({ name }));
    expect(nextAllowedVoice(voices, SYSTEM[0])?.name).toBe(SYSTEM[1]);
    expect(nextAllowedVoice(voices, SYSTEM[4])?.name).toBe(SYSTEM[0]);
  });

  it('Audio sheet: Michael is a locked option that opens Pro; Heart/system voices apply without paywall [FB-48]', async () => {
    listed = [HEART, MICHAEL, ...SYSTEM].map((name) => ({ name }));
    const { default: AudioSheet } = await import('@/components/vocabulary-app/AudioSheet');
    const { getProUpgradeState } = await import('@/services/billing/proUpgradeStore');
    render(<AudioSheet isMuted={false} isPaused={false} onToggleMute={() => {}}
      selectedVoiceName={SYSTEM[0]} playCurrentWord={() => {}} />);
    await userEvent.click(screen.getByLabelText('Audio'));
    const select = screen.getByTestId('voice-select') as HTMLSelectElement;
    await userEvent.selectOptions(select, HEART); // system -> Heart, free
    expect(getProUpgradeState().open).toBe(false);
    expect(JSON.stringify(localStorage)).toContain(HEART);
    await userEvent.selectOptions(select, SYSTEM[3]);
    expect(getProUpgradeState().open).toBe(false);
    await userEvent.selectOptions(select, MICHAEL);
    expect(getProUpgradeState()).toMatchObject({ open: true, feature: 'maleVoice' });
  });
});
