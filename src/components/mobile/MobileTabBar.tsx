import { BookOpen, ChartNoAxesCombined, Library, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppTab, type AppTab } from './appTabContext';

const TABS: Array<{ id: Exclude<AppTab, 'all'>; label: string; icon: typeof BookOpen }> = [
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'progress', label: 'Progress', icon: ChartNoAxesCombined },
  { id: 'sets', label: 'Sets', icon: Library },
  { id: 'more', label: 'More', icon: Menu },
];

const MobileTabBar = () => {
  const { tab, setTab } = useAppTab();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--lv-border-color)] bg-[var(--lv-card-bg)]/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <div className="grid grid-cols-4">
        {TABS.map((item) => {
          const selected = tab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={cn(
                'flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium',
                selected ? 'text-[var(--lv-accent)]' : 'text-[var(--lv-text-secondary)]'
              )}
              aria-current={selected ? 'page' : undefined}
              onClick={() => setTab(item.id)}
            >
              <Icon className="h-5 w-5" strokeWidth={selected ? 2.4 : 2} />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileTabBar;
