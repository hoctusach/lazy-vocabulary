
import { useCallback } from 'react';

/**
 * Hook for managing speech permissions and providing user feedback
 */
export const useSpeechPermissionManager = () => {
  // Permission is always granted in this simplified implementation
  const hasSpeechPermission = true;

  const checkSpeechPermissions = useCallback(async (): Promise<boolean> => {
    return true;
  }, []);

  return {
    hasSpeechPermission,
    checkSpeechPermissions
  };
};
