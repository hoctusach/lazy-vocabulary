import { useEffect } from 'react';
import { toast } from 'sonner';
import { nativePlatform } from '@/lib/platform/platformKind';
import { loadNativeSystemVoices } from '@/services/speech/voiceCatalog';
import { appleVoiceHintCopy, markAppleVoiceHintSeen, shouldShowAppleVoiceHint } from '@/services/speech/appleVoiceHint';

/** [FB-76] Mounted once at the app root. iOS only: shows the one-time, dismissible "download Ava / Evan" hint. */
const AppleVoiceHint = () => {
  useEffect(() => {
    if (nativePlatform() !== 'ios') return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async (retries: number) => {
      const voices = await loadNativeSystemVoices();
      if (!alive) return;
      if (voices.length === 0 && retries > 0) { timer = setTimeout(() => void check(retries - 1), 1500); return; }
      if (!shouldShowAppleVoiceHint(voices)) return;
      markAppleVoiceHintSeen(); // once, whatever the user does next
      const copy = appleVoiceHintCopy();
      toast(copy.title, {
        description: copy.body,
        duration: Infinity,
        dismissible: true,
        closeButton: true,
        action: { label: copy.action, onClick: () => {} },
      });
    };
    void check(5);
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, []);
  return null;
};

export default AppleVoiceHint;
