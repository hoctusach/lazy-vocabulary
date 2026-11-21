import type { ProFeature } from './proFeatures';

/** Tiny global store so any screen can open the one upgrade sheet without prop drilling. */
export interface ProUpgradeState {
  open: boolean;
  feature: ProFeature | null;
}

let state: ProUpgradeState = { open: false, feature: null };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => {
  try { l(); } catch { /* a bad listener must not break others */ }
});

export function openProUpgrade(feature: ProFeature | null = null): void {
  state = { open: true, feature };
  emit();
}

export function closeProUpgrade(): void {
  if (!state.open) return;
  state = { open: false, feature: state.feature };
  emit();
}

export const getProUpgradeState = (): ProUpgradeState => state;

export function subscribeProUpgrade(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Test helper. */
export function __resetProUpgradeForTests(): void {
  state = { open: false, feature: null };
  listeners.clear();
}
