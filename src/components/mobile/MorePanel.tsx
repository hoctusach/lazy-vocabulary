import React from 'react';
import UserGreeting from '@/components/UserGreeting';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import NotificationManager from '@/components/NotificationManager';
import PrivacyAndAccountCard from '@/components/mobile/PrivacyAndAccountCard';
import FriendCompareCard from '@/components/vocabulary-app/FriendCompareCard';
import { isNativePlatform } from '@/services/speech/nativeTts';
import ProCard from '@/components/mobile/ProCard';
import { isBillingSupported } from '@/services/billing/billingService';

declare const __APP_VERSION__: string;
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '';

const MorePanel: React.FC = () => {
  const native = isNativePlatform();

  return (
    <section className="space-y-4" data-screen="more">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--lv-heading)' }}>
          More
        </h2>
      </div>

      <FriendCompareCard />

      {isBillingSupported() && <ProCard />}

      <div className="rounded-2xl border p-4 theme-card-surface" style={{ borderColor: 'var(--lv-border-color)' }}>
        {/* Account & privacy group: Delete account / privacy links (feat/play-store-ads-release) slot in below the greeting. */}
        <UserGreeting />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ThemeSwitcher />
          {/* Web Notification API is unavailable in the Android WebView and no native reminder plugin exists. */}
          {!native && <NotificationManager />}
        </div>
      </div>

      <PrivacyAndAccountCard />

      <div className="rounded-2xl border p-4 text-sm leading-relaxed theme-card-surface" style={{ borderColor: 'var(--lv-border-color)' }}>
        <p className="slogan-note !text-left">
          Skim the word, then use AI for a quick mini-practice: repeat the word, meaning, and make a few examples
          about your life. Let the word stick naturally.{' '}
          <a href="https://www.youtube.com/watch?v=KytjftF0M1s" target="_blank" rel="noopener noreferrer">
            How to do it?
          </a>
        </p>
        {!native && (
          <p className="mt-3" style={{ color: 'var(--lv-text-secondary)' }}>
            Tap anywhere once if speech does not start. Browsers block audio until you interact with the page.
          </p>
        )}
        <p className="mt-4 text-xs" style={{ color: 'var(--lv-helper-text)' }}>
          Lazy Vocabulary{APP_VERSION ? ` v${APP_VERSION}` : ''} · © 2025 Lazy Vocabulary - hoctusach@gmail.com
        </p>
      </div>
    </section>
  );
};

export default MorePanel;
