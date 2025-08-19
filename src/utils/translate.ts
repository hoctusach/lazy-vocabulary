const OFFLINE_TRANSLATIONS: Record<string, Record<string, string>> = {
  hello: {
    vi: 'xin chào',
    fr: 'bonjour',
    es: 'hola',
    ja: 'こんにちは',
    zh: '你好',
    ko: '안녕하세요',
    de: 'hallo',
    ru: 'привет',
  },
  world: {
    vi: 'thế giới',
    fr: 'monde',
    es: 'mundo',
    ja: '世界',
    zh: '世界',
    ko: '세계',
    de: 'welt',
    ru: 'мир',
  },
};

export async function translate(
  word: string,
  targetLang: string,
  _sourceLang = 'en',
): Promise<string> {
  const key = word.trim().toLowerCase();
  const translation = OFFLINE_TRANSLATIONS[key]?.[targetLang];
  if (!translation) {
    throw new Error('Translation not available offline');
  }
  return translation;
}

