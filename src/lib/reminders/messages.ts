/**
 * Playful, Duolingo-style nudge copy, tiered by how far along the learner
 * is so the tone grows from "come say hi" to "you're nearly there" instead
 * of repeating the same line all day.
 */

const START_TIER = [
  "10 phút thôi, vô đi! Liếc một cái rồi ra cũng được 😌",
  "Từ vựng đang nằm chờ bạn kìa 👀",
  "Ghé một chút thôi, không cần cày cả buổi đâu.",
  "Học 3 lần 1 ngày là đẹp rồi, khỏi cần nhiều 🌱",
  "Mở app lên xíu cho từ vựng đỡ buồn 🥲",
];

const BUILDING_TIER = [
  "Sắp rồi đó! Đừng để đứt streak giữa chừng 🔥",
  "Gần lên trình rồi, cố thêm chút nữa!",
  "Bữa nay chưa ghé qua đó nha 👋",
  "Não đang đói từ vựng, cho ăn tí đi!",
  "Còn xíu nữa là qua ngày mới rồi, tranh thủ học đi!",
];

const STRONG_TIER = [
  "Sắp xịn rồi đó, đừng dừng lại chứ! 💪",
  "Cỡ này mà bỏ streak thì phí lắm nha!",
  "Sắp lên advanced rồi, cố lên!",
  "Bạn đang trên đà thành cao thủ từ vựng rồi đó 😎",
  "Chuỗi ngày học của bạn đang đẹp lắm, đừng làm gãy!",
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
