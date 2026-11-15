import React from 'react';
import { BrowserRouter } from 'react-router-dom';

/**
 * Capacitor serves the Vite build from a local origin (https://localhost on
 * Android, capacitor://localhost on iOS) and falls back to index.html, so
 * BrowserRouter works in the WebView the same way it does on the web.
 * The Vite base stays "/" because that origin hosts the app at the root.
 * HashRouter would change shared links without fixing routing here.
 */
const AppRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

export default AppRouter;
