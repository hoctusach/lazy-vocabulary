import { useEffect } from 'react';
import { trackPageView } from './events';

export default function usePageView(path: string) {
  useEffect(() => {
    if (path) {
      trackPageView(path);
    }
  }, [path]);
}

