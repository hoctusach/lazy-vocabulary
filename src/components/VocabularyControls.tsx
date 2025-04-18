
import React from 'react';
import { Button } from '@/components/ui/button';

interface VocabularyControlsProps {
  onReset: () => void;
  onNext: () => void;
}

const VocabularyControls: React.FC<VocabularyControlsProps> = () => {
  // Component empty as buttons are removed per user request
  return null;
};

export default VocabularyControls;
