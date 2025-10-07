import React, { useMemo } from 'react';
import './LoadingCard.css';

const LoadingCard: React.FC = () => {
  const messages = useMemo(
    () => [
      '⌛ We’re preparing your daily words…',
      '✨ Loading your fun vocabulary picks…',
      '📚 Gathering today’s wordy surprises…',
      '🧠 Warming up your language neurons…',
    ],
    [],
  );
  const message = useMemo(
    () => messages[Math.floor(Math.random() * messages.length)],
    [messages],
  );
  return (
    <div className="lv-loading-card" role="status" aria-live="polite">
      <div className="lv-loading-card__inner">
        <span className="lv-loading-card__text">{message}</span>
        <span className="lv-loading-card__cursor" aria-hidden="true" />
      </div>
    </div>
  );
};

export default LoadingCard;
