
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface SecurityWarningsProps {
  warnings: string[];
}

const SecurityWarnings: React.FC<SecurityWarningsProps> = ({ warnings }) => {
  if (warnings.length === 0) return null;

  return (
    <Alert>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <p className="font-medium">Security Notices:</p>
        <ul className="list-disc list-inside mt-1">
          {warnings.map((warning, index) => (
            <li key={index} className="text-sm">{warning}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
};

export default SecurityWarnings;
