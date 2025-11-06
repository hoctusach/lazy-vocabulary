import confetti from "canvas-confetti";

export function showCongratsEffect() {
  // Confetti burst 🎉
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });

  // Random short success sound 🔊
  // There are exactly 3 short audio files under /songs/ in public/.
  // Play one of them at random each time.
  const soundFiles = [
    "/songs/sound1.mp3",
    "/songs/sound2.mp3",
    "/songs/sound3.mp3",
  ];
  const randomSrc = soundFiles[Math.floor(Math.random() * soundFiles.length)];
  const audio = new Audio(randomSrc);
  audio.volume = 0.5;
  audio.play().catch(() => {});

  // Popup message 🥳
  const popup = document.createElement("div");
  popup.textContent = "🎉 Woohoo! Word mastery unlocked! ✨";
  popup.style.position = "fixed";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.background = "rgba(255, 255, 255, 0.95)";
  popup.style.color = "#333";
  popup.style.fontSize = "1.4rem";
  popup.style.fontWeight = "bold";
  popup.style.textAlign = "center";
  popup.style.padding = "20px 30px";
  popup.style.borderRadius = "16px";
  popup.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)";
  popup.style.zIndex = "9999";
  popup.style.opacity = "1";
  popup.style.transition = "opacity 0.6s ease";

  document.body.appendChild(popup);

  // Fade out and remove
  setTimeout(() => {
    popup.style.opacity = "0";
  }, 1200);
  setTimeout(() => {
    popup.remove();
  }, 2000);
}
