/**
 * Single place that decides which features belong to the Pro package.
 * There is no purchase flow yet, so every check currently allows the feature.
 * When Pro ships, change `isProUser` (for example read a RevenueCat entitlement)
 * and every gated feature follows without touching the screens.
 */
export type ProFeature = 'editTranslation';

export function isProUser(): boolean {
  return true;
}

export function canUseProFeature(_feature: ProFeature): boolean {
  return isProUser();
}
