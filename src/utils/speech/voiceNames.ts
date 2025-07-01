// Default US voice
export const US_VOICE_NAME = "en-US-Standard-B";
export const UK_VOICE_NAME = "Google UK English Female";
export const AU_VOICE_NAME = "en-AU-Standard-C";

// Ordered list of preferred voices for each region.
export const PREFERRED_VOICES_BY_REGION = {
  US: [
    "en-US-Standard-B",
    "en-US-Standard-C",
    "en-US-Wavenet-B",
    "Alex",
    "Samantha",
    "Aaron",
    "Fred",
    "Google US English",
    "en-US"
  ],
  UK: [
    "Google UK English Female",
    "Google UK English Male",
    "en-GB-Standard-A",
    "en-GB-Standard-B",
    "Daniel",
    "Kate",
    "Arthur",
    "Serena",
    "Google UK English",
    "en-GB"
  ],
  AU: [
    "en-AU-Standard-C",
    "Google AU English Female",
    "Google AU English Male",
    "Karen",
    "Lee",
    "Catherine",
    "Google AU English",
    "en-AU"
  ]
} as const;

// Aliases kept for backwards compatibility in parts of the code base
export const UK_VOICE_NAMES = PREFERRED_VOICES_BY_REGION.UK;
export const AU_VOICE_NAMES = PREFERRED_VOICES_BY_REGION.AU;

