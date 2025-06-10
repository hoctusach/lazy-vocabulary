import { useEffect, useState } from 'react';

const AudioPermissionPrompt: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hadInteraction = localStorage.getItem('hadUserInteraction') === 'true';
    if (!hadInteraction) {
      setVisible(true);
    }
  }, []);

  const handleInteraction = () => {
    localStorage.setItem('hadUserInteraction', 'true');
    setVisible(false);
  };

  useEffect(() => {
    if (!visible) return;
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-gray-800 p-4 rounded text-center">
        <p className="text-lg mb-2">Click anywhere to enable audio playback</p>
        <p className="text-sm text-muted-foreground">This is required by your browser</p>
      </div>
    </div>
  );
};

export default AudioPermissionPrompt;
