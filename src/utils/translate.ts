export async function translate(word: string, targetLang: string): Promise<string> {
  const res = await fetch("https://libretranslate.com/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: word,
      source: "en",
      target: targetLang,
      format: "text"
    })
  });
  const data = await res.json();
  return data.translatedText;
}
