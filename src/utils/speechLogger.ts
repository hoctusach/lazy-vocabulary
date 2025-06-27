export interface SpeechLogEntry {
  timestamp: number;
  event: string;
  text?: string;
  voice?: string;
  details?: unknown;
}

/**
 * Log speech events to the console and allow future aggregation.
 */
export const logSpeechEvent = (entry: SpeechLogEntry) => {
  try {
    console.log("[SPEECH-LOG]", entry);
    // Placeholder for sending to external monitoring service
  } catch (err) {
    console.warn("Failed to log speech event", err);
  }
};
