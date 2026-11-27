import { unifiedSpeechController } from './unifiedSpeechController';

/**
 * Why speech is being stopped on purpose. Only user-intent reasons belong here.
 */
export type SpeechStopReason = 'user-pause' | 'user-mute' | 'user-voice-change' | 'practice' | 'translation-edit' | 'sign-out' | 'app-teardown';

/**
 * THE ONLY place allowed to stop speech because of user intent.
 *
 * REGRESSION GUARD (auto-play kept stopping when switching bottom tabs, fixed 3+ times):
 * - Switching tabs, mounting/unmounting a tab, route changes and app background/foreground are NOT user
 *   intent. Never call speechSynthesis.cancel(), unifiedSpeechController.stop() or stopPlaybackService()
 *   from a tab component, an effect cleanup, or a tab-change hook.
 * - The Learn player (auto-play controller) is mounted once in Index (MobileHome) and only hidden
 *   (not unmounted) on other tabs, so it keeps speaking. tests/speechSurvivesTabSwitch.test.tsx
 *   fails if that changes.
 */
export function stopSpeechForUserIntent(_reason: SpeechStopReason): void {
  unifiedSpeechController.stop();
}
