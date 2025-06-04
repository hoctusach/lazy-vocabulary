
import React from 'react';

const SecurityTips: React.FC = () => {
  return (
    <div className="text-xs text-gray-600 mt-4 p-3 bg-gray-50 rounded">
      <p className="font-medium">Security Tips:</p>
      <ul className="list-disc list-inside mt-1 space-y-1">
        <li>Only upload files from trusted sources</li>
        <li>Ensure your files don't contain sensitive personal information</li>
        <li>Large files may take longer to process and validate</li>
      </ul>
    </div>
  );
};

export default SecurityTips;
