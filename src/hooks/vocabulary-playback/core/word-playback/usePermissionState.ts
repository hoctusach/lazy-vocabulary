
import { useRef, useState } from 'react';

/**
 * Hook for managing speech synthesis permission state
 */
export const usePermissionState = () => {
  // Track if we've shown a permission error already
  const permissionErrorShownRef = useRef<boolean>(false);
  
  // Track permission state
  const [hasSpeechPermission, setHasSpeechPermission] = useState(true);

  return {
    permissionErrorShownRef,
    hasSpeechPermission,
    setHasSpeechPermission
  };
};
