
import React, { useEffect } from "react";
import VocabularyLayout from "@/components/VocabularyLayout";
import WelcomeScreen from "@/components/WelcomeScreen";
import AddWordModal from "./AddWordModal";
import DebugPanel from "@/components/DebugPanel";
import ErrorDisplay from "./ErrorDisplay";
import VocabularyMain from "./VocabularyMain";
import WordActionButtons from "./WordActionButtons";
import { useVocabularyContainerState } from "@/hooks/vocabulary/useVocabularyContainerState";
import VocabularyWordManager from "./word-management/VocabularyWordManager";
import { useWordModalState } from "@/hooks/vocabulary/useWordModalState";
import { useVocabularyPlayback } from "@/hooks/vocabulary-playback";
import { toast } from "sonner";

const VocabularyAppContainer: React.FC = () => {
  // Get base vocabulary state
  const {
    hasData,
    currentWord: originalCurrentWord,
    isPaused: originalIsPaused,
    handleFileUploaded,
    jsonLoadError,
    handleSwitchCategory,
    currentCategory,
    nextCategory,
    displayTime,
    debugPanelData,
    wordList
  } = useVocabularyContainerState();

  // Use our new unified playback hook for all speech functionality
  const {
    muted,
    paused,
    voices,
    selectedVoice,
    toggleMute,
    togglePause,
    goToNextWord,
    cycleVoice,
    playCurrentWord,
    currentWord: playbackCurrentWord,
    userInteractionRef,
    isSpeaking,
    allVoiceOptions
  } = useVocabularyPlayback(wordList || []);

  // Auto-initialize speech synthesis as early as possible
  useEffect(() => {
    // Initialize speech synthesis immediately - no waiting for user interaction
    if (window.speechSynthesis) {
      // Try to force voices to load early
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log(`Initial voices loaded: ${voices.length} voices available`);
        
        // If voices are loaded, mark that we had user interaction via localStorage
        // This helps with resuming playback after page reloads
        if (voices.length > 0) {
          try {
            localStorage.setItem('hadUserInteraction', 'true');
          } catch (e) {
            console.error('Error saving user interaction state:', e);
          }
        }
      };
      
      // Try to load immediately and also listen for the voiceschanged event
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      
      // Try to create an immediate, silent utterance to activate speech synthesis
      try {
        const silentUtterance = new SpeechSynthesisUtterance(' ');
        silentUtterance.volume = 0.01; // Nearly silent
        window.speechSynthesis.speak(silentUtterance);
      } catch (e) {
        console.error('Failed to initialize silent utterance:', e);
      }
      
      // Clean up
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        window.speechSynthesis.cancel();
      };
    }
  }, []);
  
  // Global click handler to enable audio (only needed once)
  useEffect(() => {
    const enableAudioPlayback = () => {
      console.log('User interaction detected, enabling audio playback system-wide');
      // Mark that we've had user interaction
      userInteractionRef.current = true;
      
      try {
        // Store this fact in localStorage to persist across page reloads
        localStorage.setItem('hadUserInteraction', 'true');
        
        // Create and play a silent audio element to unlock audio on iOS
        const unlockAudio = document.createElement('audio');
        unlockAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
        unlockAudio.loop = false;
        unlockAudio.autoplay = true;
        unlockAudio.muted = true;
        unlockAudio.volume = 0.01;
        document.body.appendChild(unlockAudio);
        
        // Try to play it
        const playPromise = unlockAudio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            // Audio playback started successfully
            setTimeout(() => {
              document.body.removeChild(unlockAudio);
            }, 1000);
          }).catch(err => {
            console.warn('Audio unlock failed:', err);
            document.body.removeChild(unlockAudio);
          });
        }
        
        // Also initialize speech synthesis
        try {
          const utterance = new SpeechSynthesisUtterance('');
          utterance.volume = 0.01;
          utterance.onend = () => {
            console.log('Speech system initialized successfully');
            // Try to play the current word if we have one
            if (playbackCurrentWord) {
              playCurrentWord();
            }
          };
          
          utterance.onerror = (err) => {
            console.error('Speech initialization error:', err);
            toast.error("Please allow audio playback for this site");
          };
          
          window.speechSynthesis.cancel(); // Clear any pending speech
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.error('Speech initialization error:', err);
        }
      } catch (e) {
        console.error('Error during audio unlocking:', e);
      }
      
      // Remove this event listener since we only need it once
      document.removeEventListener('click', enableAudioPlayback);
      document.removeEventListener('touchstart', enableAudioPlayback);
      document.removeEventListener('keydown', enableAudioPlayback);
    };
    
    // Add event listeners for various user interaction types
    document.addEventListener('click', enableAudioPlayback);
    document.addEventListener('touchstart', enableAudioPlayback);
    document.addEventListener('keydown', enableAudioPlayback);
    
    // Check if we've had interaction before
    if (localStorage.getItem('hadUserInteraction') === 'true') {
      console.log('Previous interaction detected from localStorage');
      userInteractionRef.current = true;
      enableAudioPlayback();
    }
    
    // Clean up on unmount
    return () => {
      document.removeEventListener('click', enableAudioPlayback);
      document.removeEventListener('touchstart', enableAudioPlayback);
      document.removeEventListener('keydown', enableAudioPlayback);
    };
  }, [userInteractionRef, playCurrentWord, playbackCurrentWord]);
  
  // Force audio to play when data becomes available
  useEffect(() => {
    if (hasData && wordList && wordList.length > 0 && userInteractionRef.current) {
      console.log('Data loaded and user has interacted, triggering playback');
      // Small delay to ensure rendering completes
      const timerId = setTimeout(() => {
        playCurrentWord();
      }, 500);
      return () => clearTimeout(timerId);
    }
  }, [hasData, wordList, userInteractionRef.current, playCurrentWord]);

  // Modal state management
  const {
    isAddWordModalOpen,
    isEditMode,
    wordToEdit,
    handleOpenAddWordModal,
    handleOpenEditWordModal,
    handleCloseModal
  } = useWordModalState();

  // Use the current word from playback system as single source of truth
  const displayWord = playbackCurrentWord || originalCurrentWord;

  // Word management operations
  const wordManager = displayWord ? VocabularyWordManager({
    currentWord: displayWord,
    currentCategory,
    onWordSaved: handleCloseModal
  }) : null;

  const handleSaveWord = (wordData: { word: string; meaning: string; example: string; category: string }) => {
    if (wordManager) {
      wordManager.handleSaveWord(wordData, isEditMode, wordToEdit);
    }
  };

  // Direct category switch handler - with explicit user interaction tracking
  const handleCategorySwitchDirect = () => {
    // Mark that we've had user interaction
    userInteractionRef.current = true;
    
    if (typeof nextCategory === 'string') {
      console.log(`Switching directly to category: ${nextCategory}`);
      handleSwitchCategory(currentCategory, nextCategory);
    }
  };

  // Handle manual next with explicit user interaction
  const handleManualNext = () => {
    // This is definitely user interaction
    userInteractionRef.current = true;
    goToNextWord();
  };

  // Handle toggle pause with explicit user interaction
  const handleTogglePauseWithInteraction = () => {
    // This is definitely user interaction
    userInteractionRef.current = true;
    togglePause();
  };

  // Handle voice cycling with explicit user interaction
  const handleCycleVoiceWithInteraction = () => {
    // This is definitely user interaction
    userInteractionRef.current = true;
    cycleVoice();
  };

  // Handle toggle mute with explicit user interaction
  const handleToggleMuteWithInteraction = () => {
    // This is definitely user interaction
    userInteractionRef.current = true;
    toggleMute();
  };

  return (
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
      {/* Error display component */}
      <ErrorDisplay jsonLoadError={jsonLoadError} />

      {hasData && displayWord ? (
        <>
          {/* Main vocabulary display */}
          <VocabularyMain
            currentWord={displayWord}
            mute={muted}
            isPaused={paused}
            toggleMute={handleToggleMuteWithInteraction}
            handleTogglePause={handleTogglePauseWithInteraction}
            handleCycleVoice={handleCycleVoiceWithInteraction}
            handleSwitchCategory={handleCategorySwitchDirect}
            currentCategory={currentCategory}
            nextCategory={nextCategory}
            isSoundPlaying={isSpeaking}
            handleManualNext={handleManualNext}
            displayTime={displayTime}
            selectedVoice={selectedVoice}
          />
          
          {/* Action buttons container */}
          <WordActionButtons 
            currentWord={displayWord}
            onOpenAddModal={handleOpenAddWordModal}
            onOpenEditModal={() => handleOpenEditWordModal(displayWord)}
          />
          
          {/* Debug Panel */}
          <DebugPanel 
            isMuted={muted}
            voiceRegion={selectedVoice.region}
            isPaused={paused}
            currentWord={debugPanelData}
          />
          
          {/* Enhanced Word Modal (handles both add and edit) */}
          <AddWordModal 
            isOpen={isAddWordModalOpen} 
            onClose={handleCloseModal} 
            onSave={handleSaveWord}
            editMode={isEditMode}
            wordToEdit={isEditMode && wordToEdit ? {
              word: wordToEdit.word,
              meaning: wordToEdit.meaning,
              example: wordToEdit.example,
              category: wordToEdit.category || currentCategory
            } : undefined}
          />
        </>
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;
