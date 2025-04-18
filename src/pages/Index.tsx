
import React from 'react';
import VocabularyApp from '@/components/VocabularyApp';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-center">Lazy Vocabulary</h1>
        <p className="text-center text-muted-foreground">
          Learn vocabulary effortlessly with push notifications
        </p>
      </header>
      
      <main className="container mx-auto px-4">
        <VocabularyApp />
      </main>
      
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>© 2025 Lazy Vocabulary - Web Edition</p>
      </footer>
    </div>
  );
};

export default Index;
