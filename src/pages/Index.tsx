
import React from 'react';
import VocabularyApp from '@/components/VocabularyApp';
import VoiceDebugPanel from '@/components/VoiceDebugPanel';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-center text-blue-900">Lazy Vocabulary</h1>
        <p className="text-center text-blue-600 mt-1 text-sm font-medium">
          Master vocabulary with passive learning
        </p>
        <p className="slogan-note">
          Don’t memorize. Just skim, get it, and read examples out loud if you can!
        </p>
        {/* Removed "Are you new?" section */}
      </header>
      
      <main className="container mx-auto px-2">
        <VocabularyApp />
      </main>
      
      <footer className="mt-6 text-center text-sm text-muted-foreground">
        <p>© 2025 Lazy Vocabulary - hoctusach@gmail.com</p>
      </footer>
      <VoiceDebugPanel />
    </div>
  );
};

export default Index;
