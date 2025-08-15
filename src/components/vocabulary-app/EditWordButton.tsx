
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
      className="h-8 w-8 p-0"
      variant="outline"
      size="sm"
      disabled={disabled}
      title="Edit Word"
      aria-label="Edit Word"
    >
      <Edit size={16} />
    </Button>
  );
};

export default EditWordButton;
