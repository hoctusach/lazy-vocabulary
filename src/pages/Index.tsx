
import React from 'react';
import VocabularyApp from '@/components/VocabularyApp';
import UserProfile from '@/components/auth/UserProfile';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <header className="mb-8">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-center text-blue-900">Lazy Vocabulary</h1>
            <p className="text-center text-blue-600 mt-1 text-sm font-medium">
              Master vocabulary with passive learning
            </p>
          </div>
          <UserProfile />
        </div>
      </header>
      
      <main className="container mx-auto px-4">
        <VocabularyApp />
      </main>
      
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>© 2025 Lazy Vocabulary - hoctusach@gmail.com</p>
      </footer>
    </div>
  );
};

export default Index;
