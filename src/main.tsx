import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

if (import.meta.env.MODE === 'production') {
  console.log = () => {};
}

createRoot(document.getElementById("root")!).render(<App />);
