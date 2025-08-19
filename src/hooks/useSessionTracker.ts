import { useEffect } from 'react';

export const useSessionTracker = () => {
  const isBrowser = typeof window !== 'undefined';

  useEffect(() => {
    if (!isBrowser) return;

    const resetSession = () => {
      // Session data is intentionally kept local and not transmitted
    };

    window.addEventListener('beforeunload', resetSession);
    document.addEventListener('visibilitychange', resetSession);

    return () => {
      window.removeEventListener('beforeunload', resetSession);
      document.removeEventListener('visibilitychange', resetSession);
    };
  }, [isBrowser]);
};

