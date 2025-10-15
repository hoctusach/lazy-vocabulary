
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { loadSessionOnBoot } from '@/lib/customAuth'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { initTheme } from '@/lib/themeManager'

// Disable console logs in production for better performance
if (import.meta.env.PROD) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
}

loadSessionOnBoot();

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
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
