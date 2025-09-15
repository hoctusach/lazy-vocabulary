export function canonNickname(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, '');
}

export function isNicknameAllowed(raw: string): boolean {
  return !/[<>+'"\\;`]/.test(raw);
}
