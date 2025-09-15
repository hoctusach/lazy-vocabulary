export function clearLegacyStreakKeys() {
  const keys = ['streakDays','usedStreakDays','badges','redeemableStreaks','stickers'];
  try {
    for (const k of keys) localStorage.removeItem(k);
  } catch {}
}
