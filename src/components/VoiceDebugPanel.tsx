import React, { useEffect, useState } from 'react';

const VoiceDebugPanel: React.FC = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const loadVoices = () => {
    const list = window.speechSynthesis.getVoices();
    setVoices(list);
  };

  useEffect(() => {
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  if (!import.meta.env.DEV) return null;

  return (
    <div className="voice-debug-panel">
      <div>[Speech] Available voices from device/browser:</div>
      {voices.map((v) => (
        <div key={`${v.name}-${v.lang}`}>
          [Voice] name: {v.name}, lang: {v.lang}, local: {String(v.localService)}, default: {String(v.default)}
        </div>
      ))}
    </div>
  );
};

export default VoiceDebugPanel;
