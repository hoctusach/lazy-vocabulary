
import React from 'react';
import { Shield } from 'lucide-react';

const SecurityInfo: React.FC = () => {
  return (
    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
      <div className="flex items-start gap-2">
        <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Secure Upload</p>
          <p>Files are validated for security. Only .xlsx, .xls, .csv, and .json files up to 10MB are accepted.</p>
        </div>
      </div>
    </div>
  );
};

export default SecurityInfo;
