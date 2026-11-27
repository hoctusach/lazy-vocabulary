import { useEffect, useState } from 'react';

export function getPrimaryDeviceLanguage(): string {
  if (typeof navigator === 'undefined') return '';
  return navigator.languages?.[0] || navigator.language || '';
}

export function isVietnameseDevice(): boolean {
  return getPrimaryDeviceLanguage().toLowerCase().startsWith('vi');
}

export function useIsVietnameseDevice(): boolean {
  const [isVi, setIsVi] = useState<boolean>(() => isVietnameseDevice());
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setIsVi(isVietnameseDevice());
    window.addEventListener('languagechange', update);
    update();
    return () => window.removeEventListener('languagechange', update);
  }, []);
  return isVi;
}
