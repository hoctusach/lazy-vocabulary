
import { speechController } from '../core/speechController';

/**
 * Debug helper for testing speech controller functionality
 * Can be called from the browser console
 */
export const speechDebugHelper = {
  // Test basic speech functionality
  async testBasicSpeech(text: string = "Testing speech controller") {
    console.log('=== Testing Basic Speech ===');
    console.log('Initial state:', speechController.getState());
    
    const success = await speechController.speak(text, {
      onStart: () => console.log('✅ Speech started'),
      onEnd: () => console.log('✅ Speech ended'),
      onError: (e) => console.error('❌ Speech error:', e)
    });
    
    console.log('Speech initiated:', success);
    return success;
  },

  // Check controller state
  checkState() {
    const state = speechController.getState();
    const browserState = {
      speaking: window.speechSynthesis?.speaking,
      paused: window.speechSynthesis?.paused
    };
    
    console.log('=== Speech Controller State ===');
    console.log('Controller state:', state);
    console.log('Browser state:', browserState);
    console.log('Controller isActive():', speechController.isActive());
    
    return { state, browserState };
  },

  // Force reset the controller
  forceReset() {
    console.log('=== Force Resetting Controller ===');
    speechController.forceReset();
    console.log('Reset complete. New state:', speechController.getState());
  },

  // Test state synchronization
  testStateSync() {
    console.log('=== Testing State Synchronization ===');
    
    // Subscribe to state changes
    const unsubscribe = speechController.subscribe((state) => {
      console.log('State change detected:', state);
    });
    
    console.log('Subscribed to state changes. Test speech to see updates.');
    
    // Return cleanup function
    return unsubscribe;
  },

  // Test the isActive() method specifically
  testIsActive() {
    console.log('=== Testing isActive() Method ===');
    
    const controllerState = speechController.getState();
    const browserSpeaking = window.speechSynthesis?.speaking;
    const browserPaused = window.speechSynthesis?.paused;
    const isActiveResult = speechController.isActive();
    
    console.log('Controller internal isActive:', controllerState.isActive);
    console.log('Browser speaking:', browserSpeaking);
    console.log('Browser paused:', browserPaused);
    console.log('Controller isActive() result:', isActiveResult);
    
    const expectedActive = controllerState.isActive || browserSpeaking;
    const isCorrect = isActiveResult === expectedActive;
    
    console.log('Expected active:', expectedActive);
    console.log('Is correct:', isCorrect ? '✅' : '❌');
    
    return { isActiveResult, expectedActive, isCorrect };
  }
};

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  interface WindowWithSpeechDebug extends Window {
    speechDebugHelper: typeof speechDebugHelper;
  }
  (window as unknown as WindowWithSpeechDebug).speechDebugHelper = speechDebugHelper;
  console.log('Speech debug helper available as window.speechDebugHelper');
}
