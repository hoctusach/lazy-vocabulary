
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
      className="flex items-center justify-center gap-2 py-0.5 px-1.5 text-xs"
      variant="outline"
      size="sm"
    >
      <Plus className="h-4 w-4" />
      <span>Add Word</span>
    </Button>
  );
};

export default AddWordButton;
