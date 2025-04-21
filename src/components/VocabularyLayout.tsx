
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
      {children}
    </div>
  );
};

export default VocabularyLayout;
