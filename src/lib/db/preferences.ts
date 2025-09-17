import type { UserPreferences } from '@/core/models';
import { getLocalPreferences, saveLocalPreferences } from '@/lib/preferences/localPreferences';

const DEFAULT_PREFS: UserPreferences = {
  favorite_voice: null,
  speech_rate: null,
  is_muted: false,
  is_playing: false,
  daily_option: null,
};

export async function getPreferences(): Promise<UserPreferences> {
  const prefs = await getLocalPreferences();
  return { ...DEFAULT_PREFS, ...prefs } as UserPreferences;
}

export async function savePreferences(p: Partial<UserPreferences>): Promise<void> {
  await saveLocalPreferences(p);
}
