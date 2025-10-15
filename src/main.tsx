
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { loadSessionOnBoot } from '@/lib/customAuth'
import { ThemeProvider } from '@/contexts/ThemeContext'

// Disable console logs in production for better performance
if (import.meta.env.PROD) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
}

loadSessionOnBoot();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
