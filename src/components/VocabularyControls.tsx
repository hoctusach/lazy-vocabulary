
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface VocabularyControlsProps {
  onReset: () => void;
  onNext: () => void;
}

const VocabularyControls: React.FC<VocabularyControlsProps> = ({ onReset, onNext }) => {
  return (
    <div className="flex justify-between">
      <Button 
        variant="outline" 
        onClick={onReset}
        className="flex-1 mr-2"
      >
        Upload New File
      </Button>
      
      <Button 
        onClick={onNext}
        className="flex-1 ml-2"
      >
        Next Word <ArrowRight size={16} className="ml-1" />
      </Button>
    </div>
  );
};

export default VocabularyControls;
