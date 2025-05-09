
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
      variant="outline" 
      className="flex items-center gap-2"
    >
      <FileText size={16} />
      <span>Export</span>
    </Button>
  );
};

export default ExportButton;
