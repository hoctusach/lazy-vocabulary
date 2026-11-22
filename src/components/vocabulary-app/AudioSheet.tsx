import React from 'react';
import { Gauge, Lock, Speaker, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useSpeechRate } from '@/hooks/useSpeechRate';
import { useVoiceContext } from '@/hooks/useVoiceContext';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';
import { lockedProVoiceIn } from '@/services/speech/voiceAccess';
import { openProUpgrade } from '@/services/billing/proUpgradeStore';
import { useProFeature } from '@/services/billing/proFeatures';
import { trackUiInteraction } from '@/services/analyticsService';
import { CONTROL_TOAST } from './controlToast';
import { SPEECH_RATE_OPTIONS } from './SpeechRateControl';

interface AudioSheetProps {
  isMuted: boolean;
  isPaused: boolean;
  onToggleMute: () => void;
  onCycleVoice: () => void;
  selectedVoiceName: string;
  playCurrentWord: () => void;
  triggerClassName?: string;
}

/**
 * One "Audio" button on the Learn dock. Opens a themed bottom sheet holding the
 * Mute toggle, Change Voice and Speech Rate controls.
 */
const AudioSheet: React.FC<AudioSheetProps> = ({
  isMuted,
  isPaused,
  onToggleMute,
  onCycleVoice,
  selectedVoiceName,
  playCurrentWord,
  triggerClassName,
}) => {
  const { speechRate, setSpeechRate } = useSpeechRate();
  const { allVoices } = useVoiceContext();
  useProFeature('maleVoice'); // re-render when the entitlement changes
  const lockedVoice = lockedProVoiceIn(allVoices);
  const [open, setOpen] = React.useState(false);
  const [showRates, setShowRates] = React.useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setShowRates(false);
  };

  const handleToggleMute = () => {
    onToggleMute();
    trackUiInteraction(isMuted ? 'unmute' : 'mute', { label: isMuted ? 'Unmute' : 'Mute' });
    toast(isMuted ? 'Audio unmuted. Speech will resume from the next word.' : 'Audio muted', CONTROL_TOAST);
  };

  const handleCycleVoice = () => {
    if (allVoices.length === 0) {
      toast.warning('No voices available');
      return;
    }
    onCycleVoice();
    trackUiInteraction('cycle_voice', { label: selectedVoiceName });
  };

  const handleRateChange = (r: number) => {
    setSpeechRate(r);
    trackUiInteraction('speech_rate_change', {
      label: `${r}x`,
      value: r,
      context: { source: 'audio_sheet' },
    });
    unifiedSpeechController.stop();
    if (!isMuted && !isPaused) playCurrentWord();
    handleOpenChange(false);
  };

  const rowClass = 'lv-audio-row h-12 w-full justify-start gap-3 px-3 text-sm';
  const rateLabel = `${speechRate}x`;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'lv-ctl lv-ctl-audio h-11 min-h-11 w-full flex-col gap-1 px-1 py-1 text-[11px] leading-none md:h-11 md:w-11 md:flex-row md:px-0',
            'border border-slate-200 bg-background text-gray-700 hover:text-[var(--lv-accent)] dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:text-[var(--lv-accent)]',
            triggerClassName
          )}
          title="Audio"
          aria-label="Audio"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          <span className="md:sr-only">Audio</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="lv-audio-sheet">
        <SheetHeader>
          <SheetTitle>Audio</SheetTitle>
          <SheetDescription className="sr-only">Mute, voice and speech speed</SheetDescription>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            variant="outline"
            className={rowClass}
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </Button>

          <Button
            variant="outline"
            className={cn(rowClass, allVoices.length < 2 && 'cursor-not-allowed opacity-50')}
            onClick={handleCycleVoice}
            disabled={allVoices.length < 2}
            title={allVoices.length < 2 ? 'No other voices available' : 'Change Voice'}
            aria-label="Change Voice"
          >
            <Speaker size={18} aria-hidden="true" />
            <span>Voice</span>
            {selectedVoiceName && (
              <span className="ml-auto max-w-[55%] truncate text-xs text-muted-foreground">{selectedVoiceName}</span>
            )}
          </Button>

          {lockedVoice && (
            <Button
              variant="outline"
              className={rowClass}
              onClick={() => openProUpgrade('maleVoice')}
              aria-label="Pro voice (locked)"
              data-testid="locked-pro-voice"
            >
              <Lock size={18} aria-hidden="true" />
              <span className="truncate">{lockedVoice.name}</span>
              <span className="ml-auto text-xs font-semibold text-[var(--lv-accent)]">Pro</span>
            </Button>
          )}

          <Button
            variant="outline"
            className={rowClass}
            onClick={() => setShowRates((v) => !v)}
            aria-expanded={showRates}
            aria-label="Speech Rate"
            title="Speech Rate"
          >
            <Gauge size={18} aria-hidden="true" />
            <span>Speed</span>
            <span className="ml-auto text-xs text-muted-foreground">{rateLabel}</span>
          </Button>
          {showRates && (
            <div className="grid grid-cols-4 gap-2" data-testid="speech-rate-options">
              {SPEECH_RATE_OPTIONS.map(({ value, label }) => {
                const isActive = Math.abs(speechRate - value) < 0.001;
                return (
                  <Button
                    key={value}
                    size="sm"
                    variant={isActive ? 'default' : 'outline'}
                    className="min-h-11 px-2 text-xs"
                    aria-pressed={isActive}
                    onClick={() => handleRateChange(value)}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AudioSheet;
