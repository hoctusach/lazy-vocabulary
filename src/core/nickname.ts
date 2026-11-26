/**
 * The one canonical form of a nickname (used for the user key). Must match the Edge Functions:
 * spaces and invisible format characters (zero-width space, BOM...) are ignored.
 */
export function canonNickname(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\p{Cf}]+/gu, '');
}

export function isNicknameAllowed(raw: string): boolean {
  return !/[<>+'"\\;`]/.test(raw);
}
