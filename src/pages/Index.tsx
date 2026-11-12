
import VocabularyAppWithLearning from '@/components/VocabularyAppWithLearning';
import UserGreeting from '@/components/UserGreeting';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import NotificationManager from '@/components/NotificationManager';
import { useDailyReminder } from '@/hooks/useDailyReminder';
import FriendCompareCard from '@/components/vocabulary-app/FriendCompareCard';
import { AppShell } from '@/components/mobile/AppShell';
import { useAppTab } from '@/components/mobile/appTabContext';
import WordSetsPanel from '@/components/word-sets/WordSetsPanel';
import { cn } from '@/lib/utils';

const Index = () => (
  <AppShell>
    <IndexScreen />
  </AppShell>
);

const IndexScreen = () => {
  useDailyReminder();
  const { tab, inShell } = useAppTab();
  const showSets = !inShell || tab === 'sets';
  const showMore = !inShell || tab === 'more';

  return (
    <div className="min-h-dvh transition-colors duration-300">
      <header className="relative px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="text-center text-[1.65rem] font-bold leading-tight" style={{ color: 'var(--lv-heading)' }}>
          Lazy Vocabulary
        </h1>
        <p className="mt-1 text-center text-sm font-medium sm:hidden" style={{ color: 'var(--lv-subheading)' }}>
          Skim, listen, and let the word stick.
        </p>
        <h2
          className="mt-0.5 hidden text-center text-sm font-medium sm:block"
          style={{ color: 'var(--lv-subheading)' }}
        >
          Master vocabulary with passive learning!
        </h2>
        <p className="slogan-note hidden md:block">
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
      </header>

      <main className="mx-auto w-full max-w-6xl px-3">
        <FriendCompareCard className="mb-2 mt-3 hidden md:block" />
        <details className="mt-3 hidden rounded-2xl border border-[var(--lv-border-color)] bg-[var(--lv-card-bg)] md:block">
          <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold text-[var(--lv-heading)]">
            Word sets
          </summary>
          <div className="px-3 pb-4">
            <WordSetsPanel />
          </div>
        </details>
        <VocabularyAppWithLearning />
        <section className={cn('mt-3 md:hidden', showSets ? 'block' : 'hidden')}>
          <WordSetsPanel />
        </section>
      </main>

      <footer
        className={cn(
          'mt-4 px-4 pb-6 text-center text-sm',
          showMore ? 'block' : 'hidden',
          'md:block'
        )}
        style={{ color: 'var(--lv-text-secondary)' }}
      >
        <p className="slogan-note mx-auto mb-3 max-w-xl md:hidden">
          Repeat the word, the meaning, and a sentence about your life.{' '}
          <a href="https://www.youtube.com/watch?v=KytjftF0M1s" target="_blank" rel="noopener noreferrer">
            How to do it?
          </a>
        </p>
        <UserGreeting />
        <div className="mt-3 flex items-center justify-center gap-2">
          <ThemeSwitcher />
          <NotificationManager />
        </div>
        <p className="mt-3">© 2025 Lazy Vocabulary - hoctusach@gmail.com</p>
      </footer>
    </div>
  );
};

export default Index;
