import React, { useEffect, useState } from 'react';

const VoiceDebugPanel: React.FC = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const loadVoices = () => {
    const list = window.speechSynthesis.getVoices();
    if (list.length > 0) {
      setVoices(list);
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    }
  };

  useEffect(() => {
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  return (
    <div className="voice-debug-panel">
      {voices.length === 0 ? (
        <div>No voices available on this device/browser.</div>
      ) : (
        <pre>
          {`[Speech] Available voices from device/browser:
${voices
  .map(
    (v) =>
      `[Voice] name: ${v.name}, lang: ${v.lang}, local: ${v.localService}, default: ${v.default}`
  )
  .join('\n')}`}
        </pre>
      )}
    </div>
  );
};

export default VoiceDebugPanel;
