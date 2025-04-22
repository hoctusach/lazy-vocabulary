
import React from 'react';
import VocabularyApp from '@/components/VocabularyApp';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <header className="mb-8">
        <h1 className="text-xl font-bold text-center text-blue-900">Lazy Vocabulary</h1>
        <p className="text-center text-blue-600 mt-1 text-sm font-medium">
          Learn vocabulary effortlessly with repeating sounds
        </p>
        {/* Removed "Are you new?" section */}
      </header>
      
      <main className="container mx-auto px-4">
        <VocabularyApp />
      </main>
      
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>© 2025 Lazy Vocabulary - hoctusach</p>
      </footer>
    </div>
  );
};

export default Index;
