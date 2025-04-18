
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface VocabularyLayoutProps {
  showWordCard: boolean;
  hasData: boolean;
  onToggleView: () => void;
  children: React.ReactNode;
}

const VocabularyLayout: React.FC<VocabularyLayoutProps> = ({
  showWordCard,
  hasData,
  onToggleView,
  children
}) => {
  return (
    <div className="flex flex-col gap-6 w-full max-w-xl mx-auto p-4">
      {!showWordCard && hasData && (
        <div className="flex justify-start mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onToggleView}
            className="flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            Back to Vocabulary
          </Button>
        </div>
      )}
      {children}
    </div>
  );
};

export default VocabularyLayout;
