import { VocabularyWord } from "@/types/vocabulary";
import { getSpeechRate } from "@/utils/speech/core/speechSettings";
import {
  initializeSpeechSystem,
  speechInitialized,
} from "@/utils/speech/core/modules/speechInit";
import { logSpeechEvent } from "@/utils/speechLogger";

interface SpeechOptions {
  voiceRegion: "US" | "UK" | "AU";
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
      if (localStorage.getItem('hadUserInteraction') !== 'true') {
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
      voice: options.voiceRegion,
    });
    console.log(
      "RealSpeechService: Starting speech for:",
      text.substring(0, 50) + "...",
    );

    // Stop any current speech
    this.stop();

    // Wait for voices to be loaded
    await this.ensureVoicesLoaded();

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);

      // Set voice based on region
      const voice = this.findVoiceByRegion(options.voiceRegion);
      if (voice) {
        utterance.voice = voice;
        console.log(
          "Using voice:",
          voice.name,
          "for region:",
          options.voiceRegion,
        );
      } else {
        console.warn(
          "No suitable voice found for region:",
          options.voiceRegion,
        );
      }

      if (!utterance.voice) {
        const allVoices = speechSynthesis.getVoices();
        const fallback =
          allVoices.find(v => v.lang.startsWith('en')) || allVoices[0] || null;
        if (fallback) {
          utterance.voice = fallback;
          console.log(
            "Falling back to voice:",
            fallback.name,
          );
        }
      }

      // Configure speech settings
      utterance.rate = getSpeechRate();
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

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
        if (options.onEnd) {
          options.onEnd();
        }
        resolve(true);
      };

      utterance.onerror = (event) => {
        console.error(
          "[Speech ERROR]",
          event.error,
          text.substring(0, 60),
          utterance.voice?.name,
          utterance.voice?.lang,
          "speaking:",
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
          try {
            localStorage.setItem('hadUserInteraction', 'false');
          } catch (e) {
            console.warn('Failed to update interaction state after block:', e);
          }
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
      if (voices.length > 0) {
        resolve();
        return;
      }

      const loadVoices = () => {
        const newVoices = window.speechSynthesis.getVoices();
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
      window.speechSynthesis.cancel();
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

  isCurrentlyActive(): boolean {
    return this.isActive && window.speechSynthesis?.speaking;
  }

  getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }

  private findVoiceByRegion(
    region: "US" | "UK" | "AU",
  ): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();

    if (voices.length === 0) {
      console.warn("No voices available");
      return null;
    }

    console.log(
      "Available voices:",
      voices.map((v) => `${v.name} (${v.lang})`),
    );

    const regionPatterns = {
      US: ["en-US", "en_US"],
      UK: ["en-GB", "en_GB"],
      AU: ["en-AU", "en_AU"],
    };

    const patterns = regionPatterns[region];

    // First try to find exact language matches
    for (const pattern of patterns) {
      const voice = voices.find(
        (v) => v.lang === pattern || v.lang.startsWith(pattern.substring(0, 5)),
      );
      if (voice) {
        console.log(`Found ${region} voice:`, voice.name, voice.lang);
        return voice;
      }
    }

    // Fallback to any English voice
    const englishVoice = voices.find((v) => v.lang.startsWith("en"));
    if (englishVoice) {
      console.log(
        `Using fallback English voice for ${region}:`,
        englishVoice.name,
      );
      return englishVoice;
    }

    // Last resort - use first available voice
    if (voices.length > 0) {
      console.log(`Using first available voice for ${region}:`, voices[0].name);
      return voices[0];
    }

    console.warn(`No suitable voice found for region ${region}`);
    return null;
  }
}

export const realSpeechService = new RealSpeechService();
