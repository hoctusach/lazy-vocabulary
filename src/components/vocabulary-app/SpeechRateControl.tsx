import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from '@/components/ui/popover';
import { Gauge } from 'lucide-react';
import { trackUiInteraction } from '@/services/analyticsService';
import { cn } from '@/lib/utils';

interface SpeechRateControlProps {
  rate: number;
  onChange: (rate: number) => void;
  buttonClassName?: string;
}

const RATE_OPTIONS = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 1.75, label: '1.75x' },
  { value: 2, label: '2x' },
];

const SpeechRateControl: React.FC<SpeechRateControlProps> = ({ rate, onChange, buttonClassName }) => {
  const [open, setOpen] = React.useState(false);

  const handleChange = (v: number) => {
    onChange(v);
    trackUiInteraction('speech_rate_change', {
      label: `${v}x`,
      value: v,
      context: { source: 'speech_rate_control' },
    });
    setOpen(false); // close popup after selecting rate
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-11 min-h-11 w-full flex-col gap-1 px-1 text-[11px] text-gray-700 hover:text-[var(--lv-accent)] dark:text-gray-200 dark:hover:text-[var(--lv-accent)] md:w-11',
            buttonClassName
          )}
          title="Speech Rate"
          aria-label="Speech Rate"
        >
          <Gauge size={18} />
          <span className="md:sr-only">Speed</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" side="top" align="center">
        <div className="grid grid-cols-4 gap-2">
          {RATE_OPTIONS.map(({ value, label }) => {
            const isActive = Math.abs(rate - value) < 0.001;
            return (
              <PopoverClose asChild key={value}>
                <Button
                  size="sm"
                  variant={isActive ? 'default' : 'outline'}
                  className="min-h-11 px-2 text-xs"
                  onClick={() => handleChange(value)}
                >
                  {label}
                </Button>
              </PopoverClose>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SpeechRateControl;
