/**
 * [FB-43] Best-effort `lang` for a user-typed translation, only when the script makes it unambiguous.
 * Direction itself is left to the browser via dir="auto" (RTL for Arabic/Hebrew). Returns undefined when unknown.
 */
export function guessLang(text: string): string | undefined {
  if (/[\u0590-\u05FF]/.test(text)) return 'he';
  if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) return 'ar';
  if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
  if (/[\u3040-\u30FF]/.test(text)) return 'ja';
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  return undefined;
}
