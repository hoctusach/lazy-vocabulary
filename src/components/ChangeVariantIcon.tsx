import React from 'react';
import { Button } from '@/components/ui/button';
import { Shuffle } from 'lucide-react';
import { useVoiceContext } from '@/hooks/context/useVoiceContext';

const ChangeVariantIcon: React.FC = () => {
  const { variant, cycleVariant } = useVoiceContext();

  const handleClick = () => {
    cycleVariant();
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleClick}
      aria-label={`Variant ${variant}`}
      title={`Variant ${variant}`}
      className="text-blue-700 border-blue-300 bg-blue-50"
    >
      <Shuffle size={16} />
    </Button>
  );
};

export default ChangeVariantIcon;
