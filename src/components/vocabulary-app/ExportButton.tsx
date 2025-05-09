
import React from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportButtonProps {
  onClick: () => void;
}

const ExportButton: React.FC<ExportButtonProps> = ({ onClick }) => {
  return (
    <Button 
      onClick={onClick} 
      className="flex items-center justify-center gap-2 py-1 px-2 text-sm"
      variant="outline"
      size="sm"
    >
      <FileText className="h-4 w-4" />
      <span>Export</span>
    </Button>
  );
};

export default ExportButton;
