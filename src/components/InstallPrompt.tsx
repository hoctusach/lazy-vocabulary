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

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  return isIos && isSafari;
}

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
  const [showIosTip, setShowIosTip] = useState(false);
  const [dismissed, setDismissed] = useState(wasDismissed);

  useEffect(() => {
    if (isStandaloneDisplay() || wasDismissed()) return;

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (isIosSafari()) {
      setShowIosTip(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleDismiss = () => {
    dismiss();
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIosTip(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
    setDismissed(true);
  };

  if (dismissed || (!deferredPrompt && !showIosTip)) return null;

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
                : 'Tap Share, then "Add to Home Screen" for one-tap access.'}
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
