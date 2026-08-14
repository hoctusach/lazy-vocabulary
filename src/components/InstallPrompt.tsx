import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const DISMISSED_KEY = 'lazyVoca.installPromptDismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    nav.standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

const FALLBACK_TIP_DELAY_MS = 2500;

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    // ignore storage failures
  }
}

const InstallPrompt: React.FC<{ className?: string }> = ({ className }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [fallbackTip, setFallbackTip] = useState<'ios' | 'generic' | null>(null);
  const [dismissed, setDismissed] = useState(wasDismissed);

  useEffect(() => {
    if (isStandaloneDisplay() || wasDismissed()) return;

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setFallbackTip(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Chrome/Edge/Samsung Internet fire beforeinstallprompt when install
    // criteria are met — but only sometimes, and never on iOS Safari or
    // Firefox. Give it a moment, then fall back to a manual tip on any
    // mobile browser so there's always something actionable on phones.
    const fallbackTimer = window.setTimeout(() => {
      setFallbackTip((current) => {
        if (current || !isMobile()) return current;
        return isIos() ? 'ios' : 'generic';
      });
    }, FALLBACK_TIP_DELAY_MS);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  const handleDismiss = () => {
    dismiss();
    setDismissed(true);
    setDeferredPrompt(null);
    setFallbackTip(null);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
    setDismissed(true);
  };

  if (dismissed || (!deferredPrompt && !fallbackTip)) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-3 z-[60] flex justify-center px-3',
        className,
      )}
    >
      <Card className="w-full max-w-xl border-2 theme-card-surface theme-border">
        <CardContent className="flex items-center gap-3 p-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'var(--lv-accent-soft)', color: 'var(--lv-accent)' }}
          >
            {deferredPrompt ? <Download className="h-4 w-4" /> : <Share className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--lv-heading)' }}>
              Install Lazy Vocabulary
            </p>
            <p className="text-xs" style={{ color: 'var(--lv-helper-text)' }}>
              {deferredPrompt
                ? 'Add it to your home screen for one-tap access.'
                : fallbackTip === 'ios'
                ? 'Tap Share, then "Add to Home Screen" for one-tap access.'
                : 'Open your browser menu and tap "Add to Home screen" or "Install app".'}
            </p>
          </div>
          {deferredPrompt && (
            <Button size="sm" onClick={handleInstall} className="shrink-0">
              Install
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            aria-label="Dismiss install prompt"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallPrompt;
