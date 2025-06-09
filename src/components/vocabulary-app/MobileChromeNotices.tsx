
import React from 'react';

const MobileChromeNotices: React.FC = () => {
  return (
    <div className="mt-2 space-y-1 text-xs text-gray-500 italic max-w-xl mx-auto px-2">
      <p>
        • For mobile Chrome users: Please tap "Next Word" manually on your first visit to ensure proper audio functionality.
      </p>
      <p>
        • On mobile Chrome, only Australian English voice may be available in some regions.
      </p>
    </div>
  );
};

export default MobileChromeNotices;
