
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initAnalytics } from '@/lib/analytics/ga4';

// Disable console logs in production for better performance
if (import.meta.env.PROD) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

const measurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;
const ttl = Number(import.meta.env.VITE_GA4_DEDUPE_TTL_MS);
if (measurementId && typeof window !== 'undefined') {
  try {
    const consent = localStorage.getItem('analytics-consent');
    if (consent === 'granted') {
      initAnalytics(measurementId, {
        dedupeTTL: isNaN(ttl) ? undefined : ttl
      });
    }
  } catch {
    // ignore
  }
}

createRoot(rootElement).render(<App />);
