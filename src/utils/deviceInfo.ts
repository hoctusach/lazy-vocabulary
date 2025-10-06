export type DeviceInfo = {
  os: string;
  type: 'Mobile' | 'Desktop';
};

const MOBILE_REGEX = /Mobile|Android|iP(ad|hone|od)/i;

function detectOs(userAgent: string): string {
  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/Mac OS X/i.test(userAgent)) return 'Mac';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/(iPhone|iPad|iPod)/i.test(userAgent)) return 'iOS';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return 'Unknown';
}

export function getDeviceInfo(): DeviceInfo {
  if (typeof navigator === 'undefined') {
    return { os: 'Unknown', type: 'Desktop' };
  }

  const ua = navigator.userAgent || '';
  const os = detectOs(ua);
  const type = MOBILE_REGEX.test(ua) ? 'Mobile' : 'Desktop';

  return { os, type };
}
