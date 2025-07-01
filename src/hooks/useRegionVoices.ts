import { useState, useEffect, useCallback } from 'react';

export const useRegionVoices = (region: 'US' | 'UK' | 'AU') => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const loadVoices = useCallback(() => {
    if (!window.speechSynthesis) return;
    const allVoices = window.speechSynthesis.getVoices();
    const regionLangCode = region === 'US' ? 'en-US' : region === 'UK' ? 'en-GB' : 'en-AU';
    const filtered = allVoices
      .filter(v => v && v.lang && v.lang.toLowerCase().startsWith(regionLangCode.toLowerCase()))
      .filter((v, i, arr) => arr.findIndex(o => o.name === v.name) === i);
    setVoices(filtered);
    console.log(`[useRegionVoices] ${filtered.length} voices for ${region}`);
  }, [region]);

  useEffect(() => {
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [loadVoices]);

  return voices;
};
