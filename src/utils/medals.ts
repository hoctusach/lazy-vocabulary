export const MEDAL_REDEMPTIONS_KEY = 'medalRedemptions';

export function loadMedalRedemptions(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(MEDAL_REDEMPTIONS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveMedalRedemption(key: string, text: string): void {
  const data = loadMedalRedemptions();
  data[key] = text;
  try {
    localStorage.setItem(MEDAL_REDEMPTIONS_KEY, JSON.stringify(data));
  } catch {}
}
