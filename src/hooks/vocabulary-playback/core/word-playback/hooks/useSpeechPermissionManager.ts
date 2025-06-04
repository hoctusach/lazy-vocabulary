
import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Hook for managing speech permissions and providing user feedback
 */
export const useSpeechPermissionManager = () => {
  const [hasSpeechPermission, setHasSpeechPermission] = useState(true);
  const [permissionErrorShown, setPermissionErrorShown] = useState(false);
  const permissionCheckAttempts = useRef(0);
  const maxPermissionAttempts = 3;

  // Check if speech synthesis is available and permissions are granted
  const checkSpeechPermissions = useCallback(async (): Promise<boolean> => {
    console.log('[PERMISSION-MANAGER] Checking speech permissions');
    
    if (!window.speechSynthesis) {
      console.error('[PERMISSION-MANAGER] Speech synthesis not supported');
      if (!permissionErrorShown) {
        toast.error("Your browser doesn't support speech synthesis");
        setPermissionErrorShown(true);
      }
      setHasSpeechPermission(false);
      return false;
    }

    // Check if user has interacted with the page
    const hadUserInteraction = localStorage.getItem('hadUserInteraction') === 'true';
    if (!hadUserInteraction) {
      console.log('[PERMISSION-MANAGER] No user interaction detected');
      if (!permissionErrorShown) {
        toast.error("Please click anywhere on the page to enable audio playback");
        setPermissionErrorShown(true);
      }
      setHasSpeechPermission(false);
      return false;
    }

    // Simple permission check - just try to speak
    try {
      console.log('[PERMISSION-MANAGER] Permission check successful');
      setHasSpeechPermission(true);
      return true;
    } catch (error) {
      console.error('[PERMISSION-MANAGER] Error during permission check:', error);
      setHasSpeechPermission(false);
      return false;
    }
  }, [permissionErrorShown]);

  // Reset permission state for retry
  const resetPermissionState = useCallback(() => {
    console.log('[PERMISSION-MANAGER] Resetting permission state');
    setHasSpeechPermission(true);
    setPermissionErrorShown(false);
    permissionCheckAttempts.current = 0;
  }, []);

  // Handle permission errors with user-friendly messages
  const handlePermissionError = useCallback((errorType: string) => {
    console.log('[PERMISSION-MANAGER] Handling permission error:', errorType);
    
    switch (errorType) {
      case 'not-allowed':
        setHasSpeechPermission(false);
        if (!permissionErrorShown) {
          toast.error("Audio playback blocked. Please click anywhere to enable it.");
          setPermissionErrorShown(true);
        }
        break;
      case 'network':
        if (!permissionErrorShown) {
          toast.error("Network connection required for speech synthesis");
          setPermissionErrorShown(true);
        }
        break;
      default:
        if (!permissionErrorShown) {
          toast.error("Speech synthesis encountered an error");
          setPermissionErrorShown(true);
        }
    }
  }, [permissionErrorShown]);

  return {
    hasSpeechPermission,
    setHasSpeechPermission,
    permissionErrorShown,
    checkSpeechPermissions,
    resetPermissionState,
    handlePermissionError
  };
};
