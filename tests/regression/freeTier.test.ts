import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PRO_FEATURES } from '@/services/billing/proFeatures';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('[FB-06] Free/Pro split: friends leaderboard stays free, Pro is discoverable', () => {
  it('the Pro feature list is exactly no ads, set import, unlimited quiz, all themes, Michael voice, translation editing [FB-33]', () => {
    expect([...PRO_FEATURES].sort()).toEqual(['allThemes', 'editTranslation', 'importSets', 'maleVoice', 'noAds', 'unlimitedQuiz', 'unlimitedScans']);
  });
  it('friends / leaderboard code never consults Pro gating', () => {
    for (const f of ['src/components/vocabulary-app/LeaderboardPanel.tsx', 'src/lib/progress/friends.ts']) {
      let src = '';
      src = read(f);
      expect(src, f).not.toMatch(/proFeatures|useProFeature|hasFeature|openProUpgrade|isProActive/);
    }
  });
  it('the More tab renders the Pro card (entry to the pro_unlock purchase sheet)', () => {
    expect(read('src/components/mobile/MorePanel.tsx')).toMatch(/isProEnabled\(\) && <ProCard \/>/);
    expect(read('src/components/mobile/ProCard.tsx')).toContain('openProUpgrade');
  });
});
