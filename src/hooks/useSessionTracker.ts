import { useEffect, useRef } from 'react';

const STORAGE_KEY = 'deviceId';
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzILC47slquqsE81mxYDWbUJDIRTonpK0lTVa2jd7tMgT6-P9IU4ejupwDHTnIDHiHH/exec';

function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return 'unknown';
  }
}

function getBrowserInfo(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  if (/chrome|crios|crmo/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios|crmo/i.test(ua)) browser = 'Safari';
  else if (/edg/i.test(ua)) browser = 'Edge';

  let os = 'Unknown';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';

  return `${browser} on ${os}`;
}

export const useSessionTracker = () => {
  const isBrowser = typeof window !== 'undefined';
  const startRef = useRef<number>(isBrowser ? Date.now() : 0);
  const sentRef = useRef<boolean>(false);
  const locationRef = useRef<string>('unknown');
  const deviceId = isBrowser ? getDeviceId() : 'unknown';
  const browser = isBrowser ? getBrowserInfo() : 'unknown';

  useEffect(() => {
    if (!isBrowser) return;

    // Fetch location once
    fetch('https://ipinfo.io/json')
      .then(res => res.json())
      .then(data => {
        if (data && data.city && data.country) {
          locationRef.current = `${data.city}, ${data.country}`;
        }
      })
      .catch(() => {
        locationRef.current = 'unknown';
      });

    const sendSession = () => {
      if (sentRef.current) return;
      sentRef.current = true;
      const sessionEnd = Date.now();
      const payload = {
        deviceId,
        sessionStart: new Date(startRef.current).toISOString(),
        sessionEnd: new Date(sessionEnd).toISOString(),
        durationMs: sessionEnd - startRef.current,
        browser,
        location: locationRef.current || 'unknown',
      };
      try {
        if ('sendBeacon' in navigator) {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon(ENDPOINT, blob);
        }
      } catch {
        // ignore
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        sendSession();
      } else if (document.visibilityState === 'visible') {
        // New session starts when user comes back
        startRef.current = Date.now();
        sentRef.current = false;
      }
    };

    window.addEventListener('beforeunload', sendSession);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      sendSession();
      window.removeEventListener('beforeunload', sendSession);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [browser, deviceId, isBrowser]);
};
