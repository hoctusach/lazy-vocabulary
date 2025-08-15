export async function translate(
  word: string,
  targetLang: string,
  sourceLang = "en"
): Promise<string> {
  const q = encodeURIComponent(word);
  const langpair = encodeURIComponent(`${sourceLang}|${targetLang}`);
  const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=${langpair}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Translation API error: ${res.status}`);
  }
  const data = await res.json();
  return data.responseData?.translatedText ?? "";
}
