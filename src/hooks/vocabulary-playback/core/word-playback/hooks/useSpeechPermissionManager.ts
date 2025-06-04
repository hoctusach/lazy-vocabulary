
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

    // Try to create a test utterance to check permissions
    try {
      const testUtterance = new SpeechSynthesisUtterance(' ');
      testUtterance.volume = 0; // Silent test
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('[PERMISSION-MANAGER] Permission check timed out');
          resolve(false);
        }, 2000);

        testUtterance.onstart = () => {
          console.log('[PERMISSION-MANAGER] Permission check successful');
          clearTimeout(timeout);
          setHasSpeechPermission(true);
          window.speechSynthesis.cancel(); // Stop the silent utterance
          resolve(true);
        };

        testUtterance.onerror = (event) => {
          console.error('[PERMISSION-MANAGER] Permission check failed:', event.error);
          clearTimeout(timeout);
          
          if (event.error === 'not-allowed') {
            setHasSpeechPermission(false);
            if (!permissionErrorShown && permissionCheckAttempts.current < maxPermissionAttempts) {
              toast.error("Please click anywhere on the page to enable audio playback");
              setPermissionErrorShown(true);
            }
          }
          resolve(false);
        };

        window.speechSynthesis.speak(testUtterance);
        permissionCheckAttempts.current++;
      });
    } catch (error) {
      console.error('[PERMISSION-MANAGER] Error during permission check:', error);
      setHasSpeechPermission(false);
      return false;
    }
  }, [permissionErrorShown, maxPermissionAttempts]);

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
