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
      <ul className="list-disc pl-4">
        {dates.map(date => (
          <li key={date} className="text-sm">
            {date}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StickerHistory;
