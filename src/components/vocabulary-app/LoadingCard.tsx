import React from 'react';
import './LoadingCard.css';

const LoadingCard: React.FC = () => {
  return (
    <div className="lv-loading-card" role="status" aria-live="polite">
      <div className="lv-loading-card__inner">
        <span className="lv-loading-card__text">⌛ We’re preparing your daily words…</span>
        <span className="lv-loading-card__cursor" aria-hidden="true" />
      </div>
    </div>
  );
};

export default LoadingCard;
