
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
      className="w-full flex items-center justify-center gap-2 my-3"
      variant="outline"
    >
      <Plus className="h-4 w-4" />
      <span>Add New Word</span>
    </Button>
  );
};

export default AddWordButton;
