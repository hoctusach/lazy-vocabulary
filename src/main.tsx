import './silenceConsole'
import '@/services/speech/installSpeechShim'

import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/fonts.css'
import './styles/theme-tokens.css'
import './styles/themes.css'
import { loadSessionOnBoot } from '@/lib/customAuth'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { initTheme } from '@/lib/themeManager'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'

// Production console silencing lives in ./silenceConsole (first import above).

try { loadSessionOnBoot(); } catch (e) { console.error('[boot] session', e); }

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTheme, { once: true });
  } else {
    initTheme();
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <AppErrorBoundary>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </AppErrorBoundary>
);
