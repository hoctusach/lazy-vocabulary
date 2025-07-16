import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Gauge } from 'lucide-react';

interface SpeechRateControlProps {
  rate: number;
  onChange: (rate: number) => void;
}

const RATE_VALUES = [0, 0.2, 0.4, 0.6, 0.8, 1, 1.25, 1.5];

const SpeechRateControl: React.FC<SpeechRateControlProps> = ({ rate, onChange }) => {
  const [open, setOpen] = React.useState(false);

  const handleChange = (v: number) => {
    onChange(v);
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
          {RATE_VALUES.map((v) => (
            <Button
              key={v}
              size="sm"
              variant={rate === v ? 'default' : 'outline'}
              className="h-7 px-2 text-xs"
              onClick={() => handleChange(v)}
            >
              {v}x
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SpeechRateControl;
