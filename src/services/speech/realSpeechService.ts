import { VocabularyWord } from "@/types/vocabulary";
import { getSpeechRate } from "@/utils/speech/core/speechSettings";
import {
  initializeSpeechSystem,
  speechInitialized,
} from "@/utils/speech/core/modules/speechInit";
import { logSpeechEvent } from "@/utils/speechLogger";
import { logAvailableVoices } from "@/utils/speech/debug/logVoices";
import { hasUserInteracted, resetUserInteraction } from "@/utils/userInteraction";

interface SpeechOptions {
  voiceName?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: SpeechSynthesisErrorEvent) => void;
  muted?: boolean;
  paused?: boolean;
  userInteracted?: boolean;
}

class RealSpeechService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isActive = false;

  async speak(text: string, options: SpeechOptions): Promise<boolean> {
    if (!window.speechSynthesis) {
      console.error("Speech synthesis not supported");
      return false;
    }

    try {
      if (localStorage.getItem('speechUnlocked') !== 'true' || !hasUserInteracted()) {
        console.warn('[SPEECH] Blocked: waiting for user interaction');
        if (options.onError) {
          const evt = new Event('error') as SpeechSynthesisErrorEvent;
          Object.defineProperty(evt, 'error', { value: 'not-allowed' });
          options.onError(evt);
        }
        return false;
      }
    } catch {}

    if (!speechInitialized) {
      await initializeSpeechSystem();
    }

    logSpeechEvent({
      timestamp: Date.now(),
      event: "speak-attempt",
      text: text.substring(0, 60),
      voice: options.voiceName,
    });
    console.log(
      "RealSpeechService: Starting speech for:",
      text.substring(0, 50) + "...",
    );

    // Stop any current speech
    this.stop();

    // Ensure no lingering utterances remain
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }

    // Wait for voices to be loaded
    await this.ensureVoicesLoaded();

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);

      // Set voice by name when provided
      const allVoices = speechSynthesis.getVoices();
      logAvailableVoices(allVoices);
      const voice = options.voiceName
        ? allVoices.find(v => v.name === options.voiceName) || null
        : null;
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
        console.log(
          "Using voice:",
          voice.name,
        );
      } else {
        console.warn(
          "No voice found with name:",
          options.voiceName,
        );
      }

      if (!utterance.voice) {
        const allVoices = speechSynthesis.getVoices();
        logAvailableVoices(allVoices);
        const fallback =
          allVoices.find(v => v.lang.startsWith('en')) || allVoices[0] || null;
        if (fallback) {
          utterance.voice = fallback;
          utterance.lang = fallback.lang;
          console.log(
            "Falling back to voice:",
            fallback.name,
          );
        }
      }

      // Configure speech settings
      utterance.rate = getSpeechRate();
      utterance.pitch = 1.0;
      utterance.volume = options.muted ? 0 : 1;

      // Set up event handlers
      utterance.onstart = () => {
        console.log("Speech started for:", text.substring(0, 30) + "...");
        this.isActive = true;
        this.currentUtterance = utterance;
        logSpeechEvent({
          timestamp: Date.now(),
          event: "start",
          text: text.substring(0, 60),
          voice: utterance.voice?.name,
        });
        if (options.onStart) {
          options.onStart();
        }
      };

      utterance.onend = () => {
        console.log("Speech ended");
        this.isActive = false;
        this.currentUtterance = null;
        logSpeechEvent({
          timestamp: Date.now(),
          event: "end",
          text: text.substring(0, 60),
          voice: utterance.voice?.name,
        });
        const finalize = () => {
          if (options.onEnd) {
            options.onEnd();
          }
          resolve(true);
        };
        // Wait briefly to allow speaking state to reset
        setTimeout(finalize, 100);
      };

      utterance.onerror = (event) => {
        const logFn = event.error === 'canceled' ? console.info : console.error;
        logFn(
          event.error === 'canceled' ? '[Speech canceled]' : '[Speech ERROR]',
          event.error,
          text.substring(0, 60),
          utterance.voice?.name,
          utterance.voice?.lang,
          'speaking:',
          window.speechSynthesis.speaking,
        );
        logSpeechEvent({
          timestamp: Date.now(),
          event: "error",
          text: text.substring(0, 60),
          voice: utterance.voice?.name,
          details: event.error,
        });
        if (event.error === "canceled") {
          console.log(
            `Canceled context - muted: ${options.muted}, paused: ${options.paused}, userInteracted: ${options.userInteracted}`,
          );
        }
        if (event.error === "not-allowed") {
          resetUserInteraction();
          window.dispatchEvent(new Event('speechblocked'));
        }
        this.isActive = false;
        this.currentUtterance = null;
        if (options.onError) {
          options.onError(event);
        }
        resolve(false);
      };

      // Start speech
      try {
        window.speechSynthesis.speak(utterance);
        console.log("Speech synthesis started successfully");
      } catch (error) {
        console.error("Failed to start speech synthesis:", error);
        this.isActive = false;
        this.currentUtterance = null;
        resolve(false);
      }
    });
  }

  private async ensureVoicesLoaded(): Promise<void> {
    return new Promise((resolve) => {
      const voices = window.speechSynthesis.getVoices();
      logAvailableVoices(voices);
      if (voices.length > 0) {
        resolve();
        return;
      }

      const loadVoices = () => {
        const newVoices = window.speechSynthesis.getVoices();
        logAvailableVoices(newVoices);
        if (newVoices.length > 0) {
          console.log("Voices loaded:", newVoices.length, "voices available");
          resolve();
        }
      };

      window.speechSynthesis.addEventListener("voiceschanged", loadVoices, {
        once: true,
      });

      // Fallback timeout
      setTimeout(() => {
        console.log("Voice loading timeout, continuing anyway");
        resolve();
      }, 2000);
    });
  }

  stop(): void {
    if (window.speechSynthesis) {
      if (this.currentUtterance) {
        this.currentUtterance.onend = null;
        this.currentUtterance.onerror = null;
      }
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
    }
    this.isActive = false;
    this.currentUtterance = null;
  }

  pause(): void {
    if (window.speechSynthesis && this.isActive) {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  setMuted(muted: boolean): void {
    if (this.currentUtterance) {
      this.currentUtterance.volume = muted ? 0 : 1;
      // Force the speech engine to apply the new volume immediately by
      // briefly pausing and resuming. The resume is deferred to the next
      // task to ensure the volume change takes effect before speaking
      // continues.
      if (window.speechSynthesis?.speaking) {
        window.speechSynthesis.pause();
        setTimeout(() => {
          window.speechSynthesis.resume();
        }, 0);
      }
    }
  }

  isCurrentlyActive(): boolean {
    return this.isActive && window.speechSynthesis?.speaking;
  }

  getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }

}

export const realSpeechService = new RealSpeechService();
