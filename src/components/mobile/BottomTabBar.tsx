import React from 'react';
import { BookOpen, Library, MoreHorizontal, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AppTab = 'learn' | 'progress' | 'sets' | 'more';

const TABS: Array<{ id: AppTab; label: string; icon: React.ReactNode }> = [
  { id: 'learn', label: 'Learn', icon: <BookOpen className="h-5 w-5" /> },
  { id: 'progress', label: 'Progress', icon: <TrendingUp className="h-5 w-5" /> },
  { id: 'sets', label: 'Sets', icon: <Library className="h-5 w-5" /> },
  { id: 'more', label: 'More', icon: <MoreHorizontal className="h-5 w-5" /> },
];

interface BottomTabBarProps {
  tab: AppTab;
  onChange: (tab: AppTab) => void;
  className?: string;
}

const BottomTabBar: React.FC<BottomTabBarProps> = ({ tab, onChange, className }) => {
  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t bg-[var(--lv-card-bg)]/95 backdrop-blur',
        className
      )}
      style={{
        borderColor: 'var(--lv-border-color)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={cn(
                  'flex min-h-11 w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium',
                  selected ? 'text-[var(--lv-accent)]' : 'text-[var(--lv-text-secondary)]'
                )}
                aria-current={selected ? 'page' : undefined}
                onClick={() => onChange(item.id)}
              >
                {item.icon}
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomTabBar;
