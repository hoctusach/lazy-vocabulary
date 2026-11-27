import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }

  return Notification.requestPermission();
}

/**
 * A small settings toggle that requests permission for the daily reminder
 * (see useDailyReminder). It does not send notifications itself.
 */
const NotificationManager: React.FC<{ className?: string }> = ({ className }) => {
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionState(Notification.permission);
    } else {
      setPermissionState('unsupported');
    }
  }, []);

  if (permissionState === 'unsupported') return null;

  const enabled = permissionState === 'granted';

  const handleClick = async () => {
    if (enabled) {
      toast({
        title: 'Notifications are on',
        description: 'Manage this in your browser settings to turn it off.',
      });
      return;
    }

    const wasAlreadyDecided = permissionState === 'denied';
    const result = await requestNotificationPermission();
    setPermissionState(result);

    if (result === 'granted') {
      toast({
        title: 'Reminders enabled',
        description: "We'll nudge you if you haven't learned today's words yet.",
      });
    } else if (result === 'denied') {
      toast({
        title: 'Notifications blocked',
        description: wasAlreadyDecided
          ? "Your browser already has notifications blocked for this site. Open the site info (tap the icon next to the address bar) → Permissions → Notifications, then allow and try again."
          : "You blocked the request. If that wasn't intentional, open the site info (tap the icon next to the address bar) → Permissions → Notifications to allow it.",
        variant: 'destructive',
      });
    }
  };

  const label = enabled ? 'Reminders: on' : 'Reminders: off';

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="web-reminders-toggle"
      className={`inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border theme-border bg-[var(--lv-card-bg)] px-3 text-sm font-medium text-[var(--lv-text-primary)] shadow-sm transition-colors hover:bg-[var(--lv-card-highlight)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lv-accent)] ${className ?? ''}`}
      title={enabled ? 'Daily reminders on' : 'Enable daily reminders'}
      aria-label={enabled ? 'Reminders: on. Daily reminders on' : 'Reminders: off. Enable daily reminders'}
      aria-pressed={enabled}
    >
      {enabled ? (
        <Bell className="h-5 w-5 shrink-0" aria-hidden="true" style={{ color: 'var(--lv-accent)' }} />
      ) : (
        <BellOff className="h-5 w-5 shrink-0" aria-hidden="true" style={{ color: 'var(--lv-text-secondary)' }} />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
};

export default NotificationManager;
