
import { useCallback } from 'react';

/**
 * Manages region-specific timing settings for vocabulary controller
 */
export const useVocabularyControllerTiming = () => {
  // Get region-specific timing settings
  const getRegionTiming = useCallback((region: 'US' | 'UK') => {
    return {
      US: {
        wordInterval: 4000, // Longer interval for US voices
        errorRetryDelay: 3000,
        resumeDelay: 200
      },
      UK: {
        wordInterval: 3000,
        errorRetryDelay: 2500,
        resumeDelay: 150
      }
    }[region];
  }, []);

  return {
    getRegionTiming
  };
};
