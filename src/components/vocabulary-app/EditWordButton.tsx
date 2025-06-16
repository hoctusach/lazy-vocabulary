
import React from 'react';
import { Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditWordButtonProps {
  onClick: () => void;
  disabled: boolean;
}

const EditWordButton: React.FC<EditWordButtonProps> = ({ onClick, disabled }) => {
  return (
    <Button
      onClick={onClick}
      className="flex items-center justify-center gap-2 py-0.5 px-1.5 text-xs"
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
