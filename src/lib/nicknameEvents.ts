export const NICKNAME_EVENT_NAME = 'lazyVoca:nicknameChanged' as const;

export type NicknameEventDetail = {
  nickname: string | null;
  /** Nickname to prefill in the sign-in form (set when asking the user to sign in again). */
  prefill?: string;
};

export function dispatchNicknameChange(nickname: string | null, prefill?: string): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }

  try {
    const event = new CustomEvent<NicknameEventDetail>(NICKNAME_EVENT_NAME, {
      detail: prefill ? { nickname, prefill } : { nickname },
    });
    window.dispatchEvent(event);
  } catch {
    // Ignore environments where CustomEvent isn't supported
  }
}
