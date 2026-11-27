import React from 'react';
import { Gauge, Speaker, Volume2, VolumeX } from 'lucide-react';
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
import { isVoiceLocked } from '@/services/speech/voiceAccess';
import { groupVoices } from '@/services/speech/voiceCatalog';
import { selectVoiceByName } from '@/services/speech/voiceSelection';
import { openProUpgrade } from '@/services/billing/proUpgradeStore';
import { useProFeature } from '@/services/billing/proFeatures';
import { trackUiInteraction } from '@/services/analyticsService';
import { CONTROL_TOAST } from './controlToast';
import { SPEECH_RATE_OPTIONS } from './SpeechRateControl';

interface AudioSheetProps {
  isMuted: boolean;
  isPaused: boolean;
  onToggleMute: () => void;
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
  selectedVoiceName,
  playCurrentWord,
  triggerClassName,
}) => {
  const { speechRate, setSpeechRate } = useSpeechRate();
  const { allVoices } = useVoiceContext();
  useProFeature('maleVoice'); // re-render when the entitlement changes
  const groups = groupVoices(allVoices);
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

  // [FB-48] Direct choice from a grouped dropdown (replaces the slow one-by-one cycle).
  const handleSelectVoice = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    if (!name) return;
    const result = selectVoiceByName(name);
    if (result === 'locked') {
      e.target.value = selectedVoiceName; // stay on the current voice; the upgrade sheet is open
      return;
    }
    toast.success(`Voice changed to ${name}`);
    trackUiInteraction('select_voice', { label: name });
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

          <label className={cn(rowClass, 'flex items-center rounded-md border bg-background')}>
            <Speaker size={18} aria-hidden="true" />
            <span>Voice</span>
            <select
              aria-label="Voice"
              data-testid="voice-select"
              className="ml-auto h-9 min-w-0 max-w-[60%] truncate rounded border bg-background px-2 text-xs"
              value={selectedVoiceName}
              onChange={handleSelectVoice}
            >
              {groups.natural.length > 0 && (
                <optgroup label="Natural voices">
                  {groups.natural.map((v) => (
                    <option key={v.name} value={v.name}>
                      {isVoiceLocked(v.name) ? `🔒 ${v.name} (Pro)` : v.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {groups.system.length > 0 && (
                <optgroup label="Device / system voices">
                  {groups.system.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>

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
