import confetti from "canvas-confetti";

export const CONGRATS_SOUND_COUNT = 3;

/**
 * [FB-47] Base-aware URL of one of the three sounds in public/songs/.
 * A root-absolute songs path breaks in the packaged Capacitor app (built with `--base ./`, served from the WebView
 * origin / file URL), so the path is resolved from Vite's BASE_URL against the document base.
 */
export function congratsSoundUrl(n: number, base: string = import.meta.env.BASE_URL || "/", docBase?: string): string {
  const rel = `${base.endsWith("/") ? base : `${base}/`}songs/sound${n}.mp3`;
  const ref = docBase ?? (typeof document !== "undefined" ? document.baseURI : "http://localhost/");
  try {
    return new URL(rel, ref).href;
  } catch {
    return rel;
  }
}

const MESSAGES = [
  "Woohoo! You finally nailed it!",
  "You got it into that smart head of yours!",
  "Woohoo! It’s stuck in your brain now!",
];

/**
 * Celebration: confetti + random sound + themed popup. Call it SYNCHRONOUSLY from the user's tap (mark as learned):
 * the tap is the gesture that lets audio play, and the popup must not wait for any network round trip. Every part is
 * isolated so a failing sound, confetti or missing file can never stop the popup.
 */
export function showCongratsEffect() {
  if (typeof document === "undefined") return;

  try {
    // No 2D canvas (very old WebView, test DOM): skip the confetti, keep popup + sound.
    const ctx = document.createElement("canvas").getContext?.("2d");
    if (!ctx) throw new Error("no-canvas");
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 2147483000 });
  } catch {
    /* canvas not available */
  }

  try {
    const n = 1 + Math.floor(Math.random() * CONGRATS_SOUND_COUNT);
    const audio = new Audio(congratsSoundUrl(n));
    audio.volume = 0.5;
    const played = audio.play();
    if (played && typeof played.catch === "function") played.catch(() => {});
  } catch {
    /* no audio / blocked */
  }

  const popup = document.createElement("div");
  const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  popup.textContent = `🎉🎉🎉 ${message} ✨✨✨`;
  popup.className = "lv-congrats"; // surface/colours/fonts come from CSS (themes.css) so it follows the active theme
  popup.setAttribute("role", "status");
  popup.setAttribute("aria-live", "polite");
  popup.setAttribute("data-testid", "congrats-popup");
  popup.style.position = "fixed";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.zIndex = "2147483001"; // above dialogs, tab bar, SRS line, ad slot and theme overlays
  popup.style.pointerEvents = "none";
  popup.style.opacity = "1";
  popup.style.transition = "opacity 0.6s ease";
  popup.style.display = "block";
  popup.style.visibility = "visible";

  document.body.appendChild(popup);

  setTimeout(() => {
    popup.style.opacity = "0";
  }, 1200);
  setTimeout(() => {
    popup.remove();
  }, 2000);
}
