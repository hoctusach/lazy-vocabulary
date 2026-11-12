
import React, { useState } from 'react';
import VocabularyAppWithLearning from '@/components/VocabularyAppWithLearning';
import UserGreeting from '@/components/UserGreeting';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import NotificationManager from '@/components/NotificationManager';
import { useDailyReminder } from '@/hooks/useDailyReminder';
import FriendCompareCard from '@/components/vocabulary-app/FriendCompareCard';
import { VocabularySetProvider, useVocabularySets } from '@/features/word-sets/VocabularySetContext';
import VocabularySetsScreen from '@/features/word-sets/VocabularySetsScreen';
import MorePanel from '@/components/mobile/MorePanel';
import BottomTabBar, { type AppTab } from '@/components/mobile/BottomTabBar';
import { useIsDesktop } from '@/components/mobile/useIsDesktop';

const AppHeader: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { activeSet } = useVocabularySets();
  return (
    <header
      className="sticky top-0 z-30 border-b bg-[var(--lv-body-bg)]/95 backdrop-blur"
      style={{
        borderColor: 'var(--lv-border-color)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className={compact ? 'px-4 py-3' : 'px-4 pb-3 pt-4'}>
        <h1 className="text-center text-xl font-bold" style={{ color: 'var(--lv-heading)' }}>
          Lazy Vocabulary
        </h1>
        <p className="mt-0.5 text-center text-sm font-medium" style={{ color: 'var(--lv-subheading)' }}>
          {compact ? activeSet.name : 'Master vocabulary with passive learning!'}
        </p>
        {!compact && (
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
        )}
      </div>
    </header>
  );
};

const MobileHome: React.FC = () => {
  const [tab, setTab] = useState<AppTab>('learn');

  return (
    <div className="min-h-screen" data-layout="mobile">
      <AppHeader compact />
      <main
        className="mx-auto w-full max-w-lg px-3 py-3"
        style={{ paddingBottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}
      >
        {tab === 'learn' && <VocabularyAppWithLearning view="learn" />}
        {tab === 'progress' && <VocabularyAppWithLearning view="progress" />}
        {tab === 'sets' && <VocabularySetsScreen />}
        {tab === 'more' && <MorePanel />}
      </main>
      <BottomTabBar tab={tab} onChange={setTab} />
    </div>
  );
};

const DesktopHome: React.FC = () => {
  return (
    <div className="min-h-screen transition-colors duration-300" data-layout="desktop">
      <AppHeader />
      <main className="container mx-auto px-4">
        <FriendCompareCard className="mb-2" />
        <VocabularyAppWithLearning />
        <div className="mx-auto mt-6 max-w-6xl px-4">
          <VocabularySetsScreen />
        </div>
      </main>
      <footer className="mt-4 pb-8 text-center text-sm" style={{ color: 'var(--lv-text-secondary)' }}>
        <UserGreeting />
        <div className="mt-2 flex items-center justify-center gap-2">
          <ThemeSwitcher />
          <NotificationManager />
        </div>
        <p className="mt-2">© 2025 Lazy Vocabulary - hoctusach@gmail.com</p>
      </footer>
    </div>
  );
};

const IndexBody: React.FC = () => {
  useDailyReminder();
  const desktop = useIsDesktop();
  return desktop ? <DesktopHome /> : <MobileHome />;
};

const Index = () => {
  return (
    <VocabularySetProvider>
      <IndexBody />
    </VocabularySetProvider>
  );
};

export default Index;
