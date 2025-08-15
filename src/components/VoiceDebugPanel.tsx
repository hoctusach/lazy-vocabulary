import React, { useEffect, useState } from 'react';

const VoiceDebugPanel: React.FC = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const loadVoices = () => {
    const list = window.speechSynthesis.getVoices();
    if (list.length > 0) {
      const filtered = list.filter(
        (v) =>
          v.lang &&
          (v.lang.toLowerCase().startsWith('en-us') ||
            v.lang.toLowerCase().startsWith('en-gb') ||
            v.lang.toLowerCase().startsWith('en-au'))
      );
      setVoices(filtered);
    }
  };

  useEffect(() => {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
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
