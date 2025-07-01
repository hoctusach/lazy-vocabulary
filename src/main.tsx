
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeVoiceLogging } from './utils/speech/voiceLoader'

// Disable console logs in production for better performance
if (import.meta.env.PROD) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
}

initializeVoiceLogging();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(<App />);
