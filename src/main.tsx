
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { VoiceProvider } from './contexts/VoiceContext'
import './index.css'

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

createRoot(rootElement).render(
  <VoiceProvider>
    <App />
  </VoiceProvider>
);
