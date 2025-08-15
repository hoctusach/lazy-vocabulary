
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AddWordButtonProps {
  onClick: () => void;
}

const AddWordButton: React.FC<AddWordButtonProps> = ({ onClick }) => {
  return (
    <Button
      onClick={onClick}
      className="h-8 w-8 p-0"
      variant="outline"
      size="sm"
      title="Add Word"
      aria-label="Add Word"
    >
      <Plus size={16} />
    </Button>
  );
};

export default AddWordButton;
