export const EXPOSURE_DELAYS = [0, 5, 7, 10, 15, 30, 60, 90, 120];

export class TimingCalculator {
  calculateDelay(exposureCount: number): number {
    const index = Math.min(exposureCount, EXPOSURE_DELAYS.length - 1);
    return EXPOSURE_DELAYS[index];
  }

  addMinutes(timestamp: string, minutes: number): string {
    const base = timestamp ? new Date(timestamp) : new Date();
    const newTime = new Date(base.getTime() + minutes * 60000);
    return newTime.toISOString();
  }

  calculateNextAllowedTime(exposureCount: number, lastExposureTime: string): string {
    const delay = this.calculateDelay(exposureCount);
    return this.addMinutes(lastExposureTime, delay);
  }
}
