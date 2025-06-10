
import React from 'react';
import { Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditWordButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

const EditWordButton: React.FC<EditWordButtonProps> = ({ onClick, disabled = false }) => {
  return (
    <Button 
      onClick={onClick} 
      className="flex items-center justify-center gap-2 py-1 px-2 text-sm"
      variant="outline"
      size="sm"
      disabled={disabled}
    >
      <Edit className="h-4 w-4" />
      <span>Edit</span>
    </Button>
  );
};

export default EditWordButton;
