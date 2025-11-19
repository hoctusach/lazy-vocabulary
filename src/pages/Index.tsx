
import React from 'react';
import VocabularyAppWithLearning from '@/components/VocabularyAppWithLearning';
import UserGreeting from '@/components/UserGreeting';
import ThemeSwitcher from '@/components/ThemeSwitcher';

const Index = () => {
  return (
    <div className="min-h-screen py-2 transition-colors duration-300">
      <header className="relative mb-2 pt-4 sm:pt-1">
        <h1 className="text-xl font-bold text-center" style={{ color: 'var(--lv-heading)' }}>
          Lazy Vocabulary
        </h1>
        <h2
          className="text-center mt-0.5 text-sm font-medium"
          style={{ color: 'var(--lv-subheading)' }}
        >
          Master vocabulary with passive learning!
        </h2>
        <p className="slogan-note">
          Skim the word, then use AI for a quick mini-practice: repeat the word, meaning, and make few
          examples about your life. Let the word stick naturally.{' '}
          <a
            href="https://www.youtube.com/watch?v=KytjftF0M1s"
            target="_blank"
            rel="noopener noreferrer"
          >
            How to do it?
          </a>
        </p>
        {/* Removed "Are you new?" section */}
      </header>

      <main className="container mx-auto px-2">
        <VocabularyAppWithLearning />
      </main>

      <footer className="mt-4 text-center text-sm" style={{ color: 'var(--lv-text-secondary)' }}>
        <UserGreeting />
        <div className="mt-2 flex justify-center">
          <ThemeSwitcher />
        </div>
        <p className="mt-2">© 2025 Lazy Vocabulary - hoctusach@gmail.com</p>
      </footer>
    </div>
  );
};

export default Index;
