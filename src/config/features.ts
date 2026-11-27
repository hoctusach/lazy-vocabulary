/**
 * Build-time feature flags. Default OFF: set VITE_ENABLE_PRO=true to enable
 * the Pro unlock (Play Billing, ProCard, ads suppression for owners).
 */
export function isProEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_PRO === 'true';
}
