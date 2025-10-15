
import React from 'react';
import VocabularyAppWithLearning from '@/components/VocabularyAppWithLearning';
import UserGreeting from '@/components/UserGreeting';
import ThemeSwitcher from '@/components/ThemeSwitcher';

const Index = () => {
  return (
    <div className="min-h-screen py-4 transition-colors duration-300">
      <header className="mb-4 pt-10 sm:pt-4">
        <h1 className="text-xl font-bold text-center" style={{ color: 'var(--lv-heading)' }}>
          Lazy Vocabulary
        </h1>
        <h2
          className="text-center mt-1 text-sm font-medium"
          style={{ color: 'var(--lv-subheading)' }}
        >
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

      <footer
        className="mt-6 text-center text-sm"
        style={{ color: 'var(--lv-text-secondary)' }}
      >
        <UserGreeting />
        <div className="mt-4 flex justify-center">
          <ThemeSwitcher />
        </div>
        <p className="mt-4">© 2025 Lazy Vocabulary - hoctusach@gmail.com</p>
      </footer>
    </div>
  );
};

export default Index;
