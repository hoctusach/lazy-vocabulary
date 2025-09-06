import { trackEvent } from './ga4';

export interface AnalyticsEventParams {
  event_category?: string;
  event_label?: string;
  value?: number;
  [key: string]: any;
}

export const trackWordView = (word: string, category?: string) => {
  trackEvent('word_view', {
    event_category: 'content',
    event_label: word,
    ...(category ? { category } : {})
  });
};

export const trackMute = () =>
  trackEvent('mute', { event_category: 'interaction', event_label: 'Mute' });

export const trackUnmute = () =>
  trackEvent('unmute', { event_category: 'interaction', event_label: 'Unmute' });

export const trackPlay = () =>
  trackEvent('play', { event_category: 'interaction', event_label: 'Play' });

export const trackPause = () =>
  trackEvent('pause', { event_category: 'interaction', event_label: 'Pause' });

export const trackNextWord = () =>
  trackEvent('next_word', { event_category: 'interaction', event_label: 'Next Word' });

export const trackCycleVoice = (label: string) =>
  trackEvent('cycle_voice', { event_category: 'interaction', event_label: label });

export const trackSpeechRateChange = (rate: number) =>
  trackEvent('speech_rate_change', {
    event_category: 'interaction',
    event_label: `${rate}x`,
    value: rate
  });

export const trackPageView = (path: string) =>
  trackEvent('page_view', { page_path: path });

