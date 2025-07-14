import React, { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check } from 'lucide-react';
import {
  saveMedalRedemption,
  loadMedalRedemptions
} from '@/utils/medals';
import {
  redeemBadge,
  REDEEMABLE_STREAKS_KEY,
  BADGES_KEY
} from '@/utils/streak';
import { cn } from '@/lib/utils';

const MILESTONES = [5, 10, 15, 20, 30];
const ICONS: Record<number, string> = {
  5: '🏅',
  10: '🏆',
  15: '🎖️',
  20: '🌿',
  30: '👑'
};

interface MedalInfo {
  key: string;
  earned: boolean;
  redeemed: boolean;
  text: string;
  days: string[];
}

const MedalCabinet: React.FC = () => {
  const [medals, setMedals] = useState<MedalInfo[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    const load = () => {
      let badges: Record<string, boolean> = {};
      let redeemable: Record<string, string[]> = {};
      try {
        badges = JSON.parse(localStorage.getItem(BADGES_KEY) || '{}');
      } catch {
        badges = {};
      }
      try {
        redeemable = JSON.parse(localStorage.getItem(REDEEMABLE_STREAKS_KEY) || '{}');
      } catch {
        redeemable = {};
      }
      const redemptions = loadMedalRedemptions();
      const list: MedalInfo[] = MILESTONES.map(count => {
        const key = `${count}_day_streak`;
        return {
          key,
          earned: !!badges[key],
          redeemed: !!redemptions[key],
          text: redemptions[key] || '',
          days: redeemable[key] || []
        };
      });
      setMedals(list);
    };
    load();
  }, []);

  const openRedeem = (key: string) => {
    setActive(key);
    setInput('');
  };

  const closeRedeem = () => {
    setActive(null);
    setInput('');
  };

  const handleSave = () => {
    if (!active || input.trim() === '') return;
    saveMedalRedemption(active, input.trim());
    redeemBadge(active);
    const updated = medals.map(m =>
      m.key === active ? { ...m, redeemed: true, text: input.trim() } : m
    );
    setMedals(updated);
    closeRedeem();
  };

  if (medals.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="font-semibold mb-2">Medals</h3>
      <Accordion type="multiple" className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {medals.map(medal => {
          const count = parseInt(medal.key);
          const achieved = medal.days[medal.days.length - 1];
          return (
            <AccordionItem
              key={medal.key}
              value={medal.key}
              className={cn('border rounded-md', !medal.earned && 'opacity-50')}
            >
              <AccordionTrigger className="flex flex-col items-center p-2 focus:outline-none">
                <span role="img" aria-label={`${count}-day medal`} className="text-3xl">
                  {ICONS[count]}
                </span>
                {medal.earned && achieved && (
                  <span className="text-xs mt-1">
                    {new Date(achieved).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                )}
                <span className="text-xs">{count}d Streak</span>
                {medal.redeemed && <span className="text-[10px] text-green-600">Redeemed</span>}
                {!medal.earned && <span className="text-[10px] text-muted-foreground">Locked</span>}
              </AccordionTrigger>
              <AccordionContent className="space-y-1 px-2 pb-2">
                {medal.days.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {medal.days.map(d => (
                      <li key={d} className="flex items-center gap-1">
                        <Check className="h-3 w-3" aria-hidden="true" />
                        {new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </li>
                    ))}
                  </ul>
                )}
                {medal.earned && !medal.redeemed && (
                  <Popover open={active === medal.key} onOpenChange={o => (o ? openRedeem(medal.key) : closeRedeem())}>
                    <PopoverTrigger asChild>
                      <Button size="sm" className="mt-2">Redeem Reward</Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <Textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Reward note"
                        required
                        className="mb-2"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={closeRedeem}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave}>
                          Save
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                {medal.earned && medal.redeemed && (
                  <p className="text-xs text-muted-foreground mt-2">Redeemed: {medal.text}</p>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default MedalCabinet;
