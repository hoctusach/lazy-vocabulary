// Default US voice
export const US_VOICE_NAME = "en-US-Standard-B";
// Default UK voice now uses a Google standard ID
export const UK_VOICE_NAME = "en-GB-Standard-A";
export const UK_VOICE_NAMES = [
  UK_VOICE_NAME,
  "en-GB-Standard-B",
  "en-GB-Standard-C",
  // keep old Google voice labels for backward compatibility
  "Google UK English Male",
  "Google UK English Female",
  "Daniel",
  "Kate",
  "Susan",
  "Hazel"
] as const;

export const AU_VOICE_NAME = "en-AU-Standard-C";
export const AU_VOICE_NAMES = [
  AU_VOICE_NAME,
  "Google AU English Male",
  "Google AU English Female",
  "Karen",
  "Catherine"
] as const;

