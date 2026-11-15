import React from 'react';
import UserGreeting from '@/components/UserGreeting';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import NotificationManager from '@/components/NotificationManager';
import FriendCompareCard from '@/components/vocabulary-app/FriendCompareCard';
import { useVocabularySets } from '@/features/word-sets/VocabularySetContext';

const MorePanel: React.FC = () => {
  const { activeSet } = useVocabularySets();

  return (
    <section className="space-y-4" data-screen="more">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--lv-heading)' }}>
          More
        </h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--lv-text-secondary)' }}>
          Learning <span className="font-medium">{activeSet.name}</span>. Audio settings stay on this device.
          Speech uses the voices installed on your phone or browser.
        </p>
      </div>

      <FriendCompareCard />

      <div className="rounded-2xl border p-4 theme-card-surface" style={{ borderColor: 'var(--lv-border-color)' }}>
        <UserGreeting />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ThemeSwitcher />
          <NotificationManager />
        </div>
      </div>

      <div className="rounded-2xl border p-4 text-sm leading-relaxed theme-card-surface" style={{ borderColor: 'var(--lv-border-color)' }}>
        <p className="slogan-note !text-left">
          Skim the word, then use AI for a quick mini-practice: repeat the word, meaning, and make a few examples
          about your life. Let the word stick naturally.{' '}
          <a href="https://www.youtube.com/watch?v=KytjftF0M1s" target="_blank" rel="noopener noreferrer">
            How to do it?
          </a>
        </p>
        <p className="mt-3" style={{ color: 'var(--lv-text-secondary)' }}>
          Tap anywhere once if speech does not start. Phones block audio until you interact with the app.
        </p>
        <p className="mt-4 text-xs" style={{ color: 'var(--lv-helper-text)' }}>
          © 2025 Lazy Vocabulary - hoctusach@gmail.com
        </p>
      </div>
    </section>
  );
};

export default MorePanel;
