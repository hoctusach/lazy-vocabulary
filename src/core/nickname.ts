export function canonNickname(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '');
}

export function isNicknameAllowed(raw: string): boolean {
  return !/[<>+'"\\;`]/.test(raw);
}
