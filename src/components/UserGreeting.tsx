import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { clearStoredAuth, getActiveSession } from '@/lib/auth';
import { getNicknameLocal, NICKNAME_LS_KEY } from '@/lib/nickname';
import {
  dispatchNicknameChange,
  NICKNAME_EVENT_NAME,
  type NicknameEventDetail,
} from '@/lib/nicknameEvents';
import { toast } from 'sonner';

function normalizeNickname(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

const UserGreeting = () => {
  const [nickname, setNickname] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyNickname = (value?: string | null) => {
      if (typeof value === 'string') {
        setNickname(normalizeNickname(value));
      } else {
        setNickname(normalizeNickname(getNicknameLocal()));
      }
    };

    applyNickname(getNicknameLocal());

    let disposed = false;
    void (async () => {
      try {
        const session = await getActiveSession();
        if (disposed) return;
        const sessionDisplayName =
          session?.user?.name ??
          session?.name ??
          session?.user?.nickname ??
          session?.nickname ??
          null;
        if (sessionDisplayName) {
          applyNickname(sessionDisplayName);
        }
      } catch (error) {
        console.warn('UserGreeting:activeSession', error);
      }
    })();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== NICKNAME_LS_KEY) return;
      applyNickname(event.newValue ?? null);
    };

    const handleNicknameEvent = (event: Event) => {
      const detail = (event as CustomEvent<NicknameEventDetail>).detail;
      applyNickname(detail?.nickname ?? null);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(NICKNAME_EVENT_NAME, handleNicknameEvent);

    return () => {
      disposed = true;
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(NICKNAME_EVENT_NAME, handleNicknameEvent);
    };
  }, []);

  const handleSignOut = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      clearStoredAuth();
      try {
        localStorage.removeItem(NICKNAME_LS_KEY);
      } catch {
        /* ignore */
      }
      dispatchNicknameChange(null);
      setNickname(null);
      toast.success('Signed out successfully.');
    },
    [],
  );

  const handleResetPlayer = useCallback(
    async (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (isResetting) return;

      setIsResetting(true);

      const issues: Array<{ label: string; error: unknown }> = [];
      const recordIssue = (label: string, error: unknown) => {
        console.warn(label, error);
        issues.push({ label, error });
      };

      try {
        try {
          clearStoredAuth();
        } catch (error) {
          recordIssue('ResetPlayer:clearStoredAuth', error);
        }

        if (typeof window !== 'undefined') {
          try {
            window.localStorage?.clear();
          } catch (error) {
            recordIssue('ResetPlayer:localStorage', error);
          }

          try {
            window.sessionStorage?.clear();
          } catch (error) {
            recordIssue('ResetPlayer:sessionStorage', error);
          }

          if ('caches' in window) {
            try {
              const cacheNames = await window.caches.keys();
              await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
            } catch (error) {
              recordIssue('ResetPlayer:caches', error);
            }
          }

          if ('indexedDB' in window) {
            const idb = window.indexedDB as unknown as {
              databases?: () => Promise<Array<{ name?: string | null } | undefined>>;
            };
            if (typeof idb.databases === 'function') {
              try {
                const databases = await idb.databases();
                const deletions = (databases ?? [])
                  .map((db) => db?.name)
                  .filter((name): name is string => Boolean(name))
                  .map(
                    (name) =>
                      new Promise<void>((resolve) => {
                        const request = window.indexedDB.deleteDatabase(name);
                        request.onsuccess = () => resolve();
                        request.onerror = () => resolve();
                        request.onblocked = () => resolve();
                      }),
                  );
                await Promise.all(deletions);
              } catch (error) {
                recordIssue('ResetPlayer:indexedDB', error);
              }
            }
          }

          if ('serviceWorker' in navigator) {
            try {
              const registrations = await navigator.serviceWorker.getRegistrations();
              await Promise.all(registrations.map((registration) => registration.unregister()));
            } catch (error) {
              recordIssue('ResetPlayer:serviceWorker', error);
            }
          }
        }

        setNickname(null);

        if (issues.length === 0) {
          toast.success('Player data cleared. Reloading…');
        } else {
          toast.warning('Player data cleared with some issues. Reloading…');
        }

        window.setTimeout(() => {
          try {
            window.location.reload();
          } catch (error) {
            recordIssue('ResetPlayer:reload', error);
          }
        }, 300);
      } finally {
        setIsResetting(false);
      }
    },
    [isResetting],
  );

  if (!nickname) {
    return null;
  }

  return (
    <p className="mt-2 text-center text-sm text-muted-foreground">
      Hello <span className="font-semibold text-foreground dark:text-foreground">{nickname}</span>,{' '}
      <a
        href="#sign-out"
        onClick={handleSignOut}
        className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
      >
        Sign out
      </a>
      {' · '}
      <a
        href="#reset-player"
        onClick={handleResetPlayer}
        aria-disabled={isResetting}
        className={`font-medium text-blue-600 hover:text-blue-700 hover:underline ${
          isResetting ? 'pointer-events-none opacity-60' : ''
        }`}
      >
        Reset player
      </a>
    </p>
  );
};

export default UserGreeting;
