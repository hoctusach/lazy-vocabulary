export const EXPOSURE_DELAYS = [0, 5, 7, 10, 15, 30, 60, 90, 120]; // minutes

export function calculateNextAllowedTime(exposureCount: number, lastExposureTime: string): string {
  const index = Math.min(exposureCount, EXPOSURE_DELAYS.length - 1);
  const delayMinutes = EXPOSURE_DELAYS[index];
  const baseTime = new Date(lastExposureTime).getTime();
  return new Date(baseTime + delayMinutes * 60000).toISOString();
}
