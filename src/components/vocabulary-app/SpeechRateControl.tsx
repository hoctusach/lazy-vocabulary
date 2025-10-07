import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from '@/components/ui/popover';
import { Gauge } from 'lucide-react';

interface SpeechRateControlProps {
  rate: number;
  onChange: (rate: number) => void;
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

const SpeechRateControl: React.FC<SpeechRateControlProps> = ({ rate, onChange }) => {
  const [open, setOpen] = React.useState(false);

  const handleChange = (v: number) => {
    onChange(v);
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'speech_rate_change', {
        event_category: 'interaction',
        event_label: `${v}x`,
        value: v
      });
    }
    setOpen(false); // close popup after selecting rate
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          title="Speech Rate"
        >
          <Gauge size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2" side="right" align="start">
        <div className="grid grid-cols-4 gap-2">
          {RATE_OPTIONS.map(({ value, label }) => {
            const isActive = Math.abs(rate - value) < 0.001;
            return (
              <PopoverClose asChild key={value}>
                <Button
                  size="sm"
                  variant={isActive ? 'default' : 'outline'}
                  className="h-7 px-2 text-xs"
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
