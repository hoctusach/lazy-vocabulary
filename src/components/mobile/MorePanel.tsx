import React from 'react';
import UserGreeting from '@/components/UserGreeting';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import NotificationManager from '@/components/NotificationManager';
import NaturalVoicesCard from '@/components/mobile/NaturalVoicesCard';
import PrivacyAndAccountCard from '@/components/mobile/PrivacyAndAccountCard';
import { isNativePlatform } from '@/services/speech/nativeTts';
import { isProEnabled } from '@/config/features';
import ProCard from '@/components/mobile/ProCard';
import { isBillingSupported } from '@/services/billing/billingService';

declare const __APP_VERSION__: string;
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '';

const OPEN_SOURCE_LICENSES = [
  { name: 'Kokoro-82M by hexgrad', url: 'https://huggingface.co/hexgrad/Kokoro-82M', license: 'Apache-2.0' },
  { name: 'sherpa-onnx by k2-fsa (Next-gen Kaldi)', url: 'https://github.com/k2-fsa/sherpa-onnx', license: 'Apache-2.0', note: 'includes OpenFst, kaldi-native-fbank (Apache-2.0) and nlohmann/json (MIT)' },
  { name: 'ONNX Runtime by Microsoft', url: 'https://github.com/microsoft/onnxruntime', license: 'MIT', note: 'statically linked in sherpa-onnx' },
  { name: 'Kokoro English lexicon (misaki-style, from the k2-fsa model package)', url: 'https://huggingface.co/csukuangfj/kokoro-int8-multi-lang-v1_0', license: 'Apache-2.0' },
  { name: 'CMU Pronouncing Dictionary', url: 'https://github.com/cmusphinx/cmudict', license: 'BSD-2-Clause', note: 'Copyright (C) 1993-2015 Carnegie Mellon University' },
  { name: 'Kotlin standard library', url: 'https://github.com/JetBrains/kotlin', license: 'Apache-2.0' },
];

const MorePanel: React.FC = () => {
  const native = isNativePlatform();

  return (
    <section className="space-y-4" data-screen="more">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--lv-heading)' }}>
          More
        </h2>
      </div>

      {isProEnabled() && isBillingSupported() && <ProCard />}

      <div className="rounded-2xl border p-4 theme-card-surface" style={{ borderColor: 'var(--lv-border-color)' }}>
        {/* Account & privacy group: Delete account / privacy links (feat/play-store-ads-release) slot in below the greeting. */}
        <UserGreeting />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ThemeSwitcher />
          {/* Web Notification API is unavailable in the Android WebView and no native reminder plugin exists. */}
          {!native && <NotificationManager />}
        </div>
      </div>

      <NaturalVoicesCard />

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
      <details className="rounded-2xl border p-4 text-sm theme-card-surface" style={{ borderColor: 'var(--lv-border-color)' }} data-section="licenses">
        <summary className="cursor-pointer font-semibold" style={{ color: 'var(--lv-heading)' }}>Open-source licenses</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5" style={{ color: 'var(--lv-text-secondary)' }}>
          {OPEN_SOURCE_LICENSES.map((l) => (
            <li key={l.name}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">{l.name}</a>{' '}
              - {l.license}{l.note ? ` (${l.note})` : ''}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
};

export default MorePanel;
