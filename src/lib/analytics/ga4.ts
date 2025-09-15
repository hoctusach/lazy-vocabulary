import type { AnalyticsEventParams } from './events';

interface InitOptions {
  dedupeTTL?: number;
}

let initialized = false;
let dedupeTTL = 30_000; // default 30s
const sentEvents = new Map<string, number>();
let cleanupTimer: number | undefined;

function loadScript(measurementId: string) {
  if (document.getElementById('ga4-script')) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.id = 'ga4-script';
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  // @ts-ignore
  window.gtag = window.gtag || gtag;
  window.gtag('js', new Date());
  window.gtag('config', measurementId);
}

function cleanup() {
  const now = Date.now();
  for (const [key, ts] of sentEvents) {
    if (now - ts > dedupeTTL) sentEvents.delete(key);
  }
}

export function initAnalytics(measurementId: string, options: InitOptions = {}) {
  if (initialized || !measurementId) return;
  dedupeTTL = options.dedupeTTL ?? dedupeTTL;
  loadScript(measurementId);
  cleanupTimer = window.setInterval(cleanup, dedupeTTL);
  initialized = true;
}

function shouldSend(key: string) {
  const now = Date.now();
  const last = sentEvents.get(key);
  if (last && now - last < dedupeTTL) return false;
  sentEvents.set(key, now);
  return true;
}

export function trackEvent(name: string, params?: AnalyticsEventParams) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  const key = `${name}:${JSON.stringify(params || {})}`;
  if (!shouldSend(key)) return;
  window.gtag('event', name, params);
}

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

