import React from 'react';
import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioStatusIndicatorProps {
  isAudioUnlocked: boolean;
}

/**
 * Mobile browsers require a real tap before they'll play speech at all, and
 * some (iOS Safari especially) can silently re-block it later — after a
 * reload, backgrounding, or navigation — until another tap unlocks it again
 * (see the 'speechblocked' handling in useEnhancedUserInteraction). Either
 * way, auto-play just goes quiet with no visible cause. This makes that
 * state visible; any tap anywhere on the page unlocks it (existing global
 * listener), so this is just a clear, honest target for that tap.
 */
const AudioStatusIndicator: React.FC<AudioStatusIndicatorProps> = ({ isAudioUnlocked }) => {
  if (isAudioUnlocked) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium',
        'theme-border animate-pulse',
      )}
      style={{ background: 'var(--lv-accent-soft)', color: 'var(--lv-accent)' }}
      role="status"
    >
      <Volume2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Tap anywhere to turn the audio on</span>
    </div>
  );
};

export default AudioStatusIndicator;
