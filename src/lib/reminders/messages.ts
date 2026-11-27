/**
 * Playful, Duolingo-style nudge copy, tiered by how far along the learner
 * is so the tone grows from "come say hi" to "you're nearly there" instead
 * of repeating the same line all day.
 */

// [FB-58] English only, short and simple.
export const START_TIER = [
  "Got 10 minutes? Your words are waiting 😌",
  "Your words are waiting for you 👀",
  "Just a quick visit. No need to study for long.",
  "Three short sessions a day is plenty 🌱",
  "Open the app and say hi to your words 🙂",
];

export const BUILDING_TIER = [
  "Almost there! Keep your streak going 🔥",
  "You are close to the next level. A little more!",
  "You have not studied yet today 👋",
  "Your brain wants some words. Feed it!",
  "The day is almost over. Study a few words now!",
];

export const STRONG_TIER = [
  "You are doing great. Keep going! 💪",
  "Your streak is too good to lose!",
  "You are nearly at the advanced level. Keep going!",
  "You are on your way to being a word master 😎",
  "Your study streak looks great. Do not break it!",
];

function pickRandom(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Picks a nudge tier from streak length and total words learned — either
 * signal can bump someone into a more encouraging tier.
 */
export function pickReminderMessage(streakDays: number, learnedCount: number): string {
  if (streakDays >= 7 || learnedCount >= 50) return pickRandom(STRONG_TIER);
  if (streakDays >= 1 || learnedCount >= 5) return pickRandom(BUILDING_TIER);
  return pickRandom(START_TIER);
}
