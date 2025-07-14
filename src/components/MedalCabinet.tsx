import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { saveMedalRedemption, loadMedalRedemptions } from '@/utils/medals';
import { redeemBadge } from '@/utils/streak';

interface MedalInfo {
  key: string;
  redeemed: boolean;
  text: string;
}

const MedalCabinet: React.FC = () => {
  const [medals, setMedals] = useState<MedalInfo[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    const load = () => {
      let badges: Record<string, boolean> = {};
      try {
        badges = JSON.parse(localStorage.getItem('badges') || '{}');
      } catch {
        badges = {};
      }
      const redemptions = loadMedalRedemptions();
      const list: MedalInfo[] = Object.keys(badges).map(key => ({
        key,
        redeemed: !!redemptions[key],
        text: redemptions[key] || ''
      }));
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
    <div className="mt-6 space-y-2">
      <h3 className="font-semibold">Medals</h3>
      {medals.map(medal => (
        <div
          key={medal.key}
          className="flex items-center justify-between border rounded-md p-2"
        >
          <div>
            <p className="text-sm font-medium">{medal.key}</p>
            {medal.redeemed && (
              <p className="text-xs text-muted-foreground">
                Redeemed: {medal.text}
              </p>
            )}
          </div>
          {!medal.redeemed && (
            <Button size="sm" onClick={() => openRedeem(medal.key)}>
              Redeem
            </Button>
          )}
        </div>
      ))}
      <Dialog open={!!active} onOpenChange={closeRedeem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🎁 Redeem Your Reward</DialogTitle>
          </DialogHeader>
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Enter your reward request"
            required
          />
          <DialogFooter>
            <Button variant="secondary" onClick={closeRedeem}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedalCabinet;
