
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ErrorDisplayProps {
  jsonLoadError: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ jsonLoadError }) => {
  if (!jsonLoadError) return null;
  
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertDescription>
        Custom vocabulary file is corrupt; loaded default list instead.
      </AlertDescription>
    </Alert>
  );
};

export default ErrorDisplay;
