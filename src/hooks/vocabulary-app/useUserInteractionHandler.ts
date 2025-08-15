import * as React from "react";
import { useEffect, useRef } from "react";
import { loadUserInteractionState } from "@/utils/userInteraction";
import {
  initializeSpeechSystem,
  registerSpeechInitGesture,
} from "@/utils/speech/core/modules/speechInit";

interface UserInteractionProps {
  userInteractionRef: React.MutableRefObject<boolean>;
  playCurrentWord: () => void;
  playbackCurrentWord: any;
  onUserInteraction?: () => void;
}

export const useUserInteractionHandler = ({
  userInteractionRef,
  playCurrentWord,
  playbackCurrentWord,
  onUserInteraction,
}: UserInteractionProps) => {
  // Track if we've already initialized to prevent duplicate initialization
  const initializedRef = useRef(false);

  // Global gesture handler to enable audio (only needed once)
  useEffect(() => {
    console.log("[USER-INTERACTION] Handler mounted");

    if (loadUserInteractionState()) {
      initializedRef.current = true;
      userInteractionRef.current = true;
      initializeSpeechSystem();
      return;
    }

    registerSpeechInitGesture();

    const enableAudioPlayback = async () => {
      // Prevent duplicate initialization
      if (initializedRef.current) {
        console.log("Audio already initialized, skipping");
        return;
      }

      console.log(
        "User interaction detected, enabling audio playback system-wide",
      );

      // Mark that we've had user interaction
      userInteractionRef.current = true;
      initializedRef.current = true;
      localStorage.setItem("speechUnlocked", "true");

      // Initialize speech system (unlock audio and preload voices)
      await initializeSpeechSystem();

      onUserInteraction?.();

      // Remove event listeners after first successful initialization
      document.removeEventListener("click", enableAudioPlayback);
      document.removeEventListener("touchstart", enableAudioPlayback);
      document.removeEventListener("keydown", enableAudioPlayback);
    };

    // Check if we've had interaction before. We still wait for a new user
    // gesture to actually unlock audio again, so simply log this information.
    if (localStorage.getItem("speechUnlocked") === "true") {
      console.log(
        "[USER-INTERACTION] Previous interaction found; waiting for new gesture to unlock audio",
      );
    }

    // Add event listeners for various user interaction types
    document.addEventListener("click", enableAudioPlayback);
    document.addEventListener("touchstart", enableAudioPlayback);
    document.addEventListener("keydown", enableAudioPlayback);

    // Clean up on unmount
    return () => {
      document.removeEventListener("click", enableAudioPlayback);
      document.removeEventListener("touchstart", enableAudioPlayback);
      document.removeEventListener("keydown", enableAudioPlayback);
    };
  }, [userInteractionRef, onUserInteraction]);
};
