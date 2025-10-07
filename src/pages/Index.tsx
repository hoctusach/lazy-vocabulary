
import React from 'react';
import VocabularyAppWithLearning from '@/components/VocabularyAppWithLearning';
import UserGreeting from '@/components/UserGreeting';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-center text-blue-900">Lazy Vocabulary</h1>
        <h2 className="text-center text-[#333333] mt-1 text-sm font-medium">
          Master vocabulary with passive learning!
        </h2>
        <p className="slogan-note">
          Just skim the word and speak it—let it stick naturally!
        </p>
        {/* Removed "Are you new?" section */}
      </header>
      
      <main className="container mx-auto px-2">
        <VocabularyAppWithLearning />
      </main>
      
      <footer className="mt-6 text-center text-sm text-muted-foreground">
        <p>© 2025 Lazy Vocabulary - hoctusach@gmail.com</p>
        <UserGreeting />
      </footer>
    </div>
  );
};

export default Index;
