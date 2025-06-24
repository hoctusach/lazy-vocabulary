
import * as React from 'react';
import { useCallback } from "react";

export const usePauseActions = (
  setIsPaused: React.Dispatch<React.SetStateAction<boolean>>
) => {
  // Toggle pause state - simple state toggle only
  const handleTogglePause = useCallback(() => {
    setIsPaused(prevIsPaused => !prevIsPaused);
  }, [setIsPaused]);

  return {
    handleTogglePause
  };
};
