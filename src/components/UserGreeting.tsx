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
        const sessionNickname = session?.user?.nickname ?? session?.nickname ?? null;
        if (sessionNickname) {
          applyNickname(sessionNickname);
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

  if (!nickname) {
    return null;
  }

  return (
    <p className="mt-2 text-center text-sm text-muted-foreground">
      Hello <span className="font-semibold text-gray-900">{nickname}</span>,{' '}
      <a
        href="#sign-out"
        onClick={handleSignOut}
        className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
      >
        Sign out
      </a>
    </p>
  );
};

export default UserGreeting;
