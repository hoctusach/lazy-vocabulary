export const USER_KEY_EVENT_NAME = 'lazyVoca:userKeyChanged' as const;

export type UserKeyEventDetail = {
  userKey: string | null;
};

export function dispatchUserKeyChange(userKey: string | null): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }

  try {
    const event = new CustomEvent<UserKeyEventDetail>(USER_KEY_EVENT_NAME, {
      detail: { userKey },
    });
    window.dispatchEvent(event);
  } catch {
    // Ignore event dispatch errors (e.g., CustomEvent not supported)
  }
}
