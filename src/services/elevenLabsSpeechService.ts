
interface ElevenLabsOptions {
  apiKey: string;
  voiceId: string;
  model?: string;
}

class ElevenLabsSpeechService {
  private apiKey: string | null = null;
  private voiceId: string = "EXAVITQu4vr4xnSDxMaL"; // Sarah voice by default
  private model: string = "eleven_multilingual_v2";
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;

  constructor() {
    // Create audio element for playback
    if (typeof window !== 'undefined') {
      this.audioElement = new Audio();
      this.audioElement.onended = () => {
        this.isPlaying = false;
        console.log("Audio playback completed");
      };
      this.audioElement.onerror = (e) => {
        console.error("Audio playback error:", e);
        this.isPlaying = false;
      };
    }
  }

  configure(options: ElevenLabsOptions) {
    this.apiKey = options.apiKey;
    if (options.voiceId) {
      this.voiceId = options.voiceId;
    }
    if (options.model) {
      this.model = options.model;
    }
    console.log(`ElevenLabs configured with voice: ${this.voiceId}`);
    return this;
  }

  async speak(text: string): Promise<void> {
    if (!this.apiKey) {
      console.error("ElevenLabs API key not set. Please configure the service first.");
      throw new Error("ElevenLabs API key not set");
    }

    if (this.isPlaying && this.audioElement) {
      // Stop current playback
      this.audioElement.pause();
      this.isPlaying = false;
    }

    try {
      this.isPlaying = true;
      console.log(`ElevenLabs speaking: ${text.substring(0, 50)}...`);
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text,
          model_id: this.model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("ElevenLabs API error:", errorText);
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }

      // Convert the response to a blob and create an object URL
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (this.audioElement) {
        this.audioElement.src = audioUrl;
        await this.audioElement.play();
      }

      return new Promise((resolve) => {
        if (this.audioElement) {
          this.audioElement.onended = () => {
            this.isPlaying = false;
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
        } else {
          this.isPlaying = false;
          resolve();
        }
      });
    } catch (error) {
      this.isPlaying = false;
      console.error("ElevenLabs speech error:", error);
      throw error;
    }
  }

  cancel() {
    if (this.audioElement && this.isPlaying) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.isPlaying = false;
    }
  }

  isApiKeySet(): boolean {
    return !!this.apiKey;
  }

  setVoice(voiceId: string): void {
    this.voiceId = voiceId;
    console.log(`ElevenLabs voice changed to: ${voiceId}`);
  }

  // Premium voices available in ElevenLabs
  static voiceOptions = [
    { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", region: "US" },
    { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", region: "UK" },
    { id: "9BWtsMINqrJLrRacOk9x", name: "Aria", region: "US" },
    { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", region: "UK" },
    { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", region: "US" },
    { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", region: "UK" }
  ];

  getRegionalVoice(region: 'US' | 'UK'): string {
    const voiceForRegion = ElevenLabsSpeechService.voiceOptions.find(v => v.region === region);
    return voiceForRegion?.id || this.voiceId;
  }
}

export const elevenLabsSpeechService = new ElevenLabsSpeechService();
