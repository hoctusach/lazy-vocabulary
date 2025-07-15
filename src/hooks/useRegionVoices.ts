import { useState, useEffect, useCallback } from 'react';
import { logAvailableVoices } from '@/utils/speech/debug/logVoices';

export const useRegionVoices = () => {
  const [usVoices, setUsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ukVoices, setUkVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [auVoices, setAuVoices] = useState<SpeechSynthesisVoice[]>([]);

  const loadVoices = useCallback(() => {
    if (!window.speechSynthesis) return;
    const allVoices = window.speechSynthesis.getVoices();
    logAvailableVoices(allVoices);

    const filterByLang = (lang: string) =>
      allVoices
        .filter(v => v && v.lang && v.lang.toLowerCase().startsWith(lang.toLowerCase()))
        .filter((v, i, arr) => arr.findIndex(o => o.name === v.name) === i);

    const us = filterByLang('en-US');
    const uk = filterByLang('en-GB');
    const au = filterByLang('en-AU');

    setUsVoices(us);
    setUkVoices(uk);
    setAuVoices(au);

    console.log(`[useRegionVoices] US:${us.length} UK:${uk.length} AU:${au.length}`);
  }, []);

  useEffect(() => {
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [loadVoices]);

  return { usVoices, ukVoices, auVoices };
};
