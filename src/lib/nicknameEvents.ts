export const NICKNAME_EVENT_NAME = 'lazyVoca:nicknameChanged' as const;

export type NicknameEventDetail = {
  nickname: string | null;
};

export function dispatchNicknameChange(nickname: string | null): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }

  try {
    const event = new CustomEvent<NicknameEventDetail>(NICKNAME_EVENT_NAME, {
      detail: { nickname },
    });
    window.dispatchEvent(event);
  } catch {
    // Ignore environments where CustomEvent isn't supported
  }
}
