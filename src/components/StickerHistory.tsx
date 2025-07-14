import React, { useEffect, useState } from 'react';

const STICKERS_KEY = 'stickers';

const StickerHistory: React.FC = () => {
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(STICKERS_KEY) || '[]');
      if (Array.isArray(data)) {
        setDates(data);
      }
    } catch {
      setDates([]);
    }
  }, []);

  if (dates.length === 0) return null;

  return (
    <div className="mt-6 space-y-1">
      <h3 className="font-semibold">Learning Days</h3>
      <div className="flex flex-wrap gap-2 justify-start">
        {dates.map(date => (
          <div key={date} className="flex flex-col items-center w-16">
            <img
              src="/assets/star-sticker.png"
              alt={`Sticker earned on ${date}`}
              className="w-12 h-12"
            />
            <span className="text-[0.75rem] text-gray-600 mt-1">
              {date}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StickerHistory;
