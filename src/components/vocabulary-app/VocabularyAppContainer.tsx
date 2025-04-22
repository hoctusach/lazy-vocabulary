
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useVocabularyManager } from "@/hooks/useVocabularyManager";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import VocabularyLayout from "@/components/VocabularyLayout";
import VocabularyCard from "@/components/VocabularyCard";
import WelcomeScreen from "@/components/WelcomeScreen";
import { vocabularyService } from "@/services/vocabularyService";

const VocabularyAppContainer: React.FC = () => {
  const {
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    handleSwitchCategory,
    setHasData
  } = useVocabularyManager();

  const {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded
  } = useSpeechSynthesis();

  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const [mute, setMute] = useState(isMuted);
  const [currentAudioDuration, setCurrentAudioDuration] = useState(0);
  const currentCategory = vocabularyService.getCurrentSheetName();
  const sheetOptions = vocabularyService.sheetOptions;
  const nextIndex = (sheetOptions.indexOf(currentCategory) + 1) % sheetOptions.length;
  const nextCategory = sheetOptions[nextIndex];

  const soundRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);  // Time the card stays visible

  const startDisplayTime = useRef(Date.now());

  const stopAudio = () => {
    if (soundRef.current) {
      soundRef.current.pause();
      soundRef.current.currentTime = 0; // Reset audio position
    }
    setAudioPlaying(false);
  };

  const playAudio = useCallback(async (text: string) => {
    if (mute || !text) return; // Don't play audio if muted or no text

    try {
      const audio = new Audio();
      soundRef.current = audio;
      
      // Call speakText and handle both string and Promise<string> returns
      const audioSource = await speakText(text);
      
      if (audioSource) {
        audio.src = audioSource;
        audio.play();

        setAudioPlaying(true);

        audio.onended = () => {
          setAudioPlaying(false);
          handleManualNext(); // Proceed to next word after the sound finishes
        };

        // Get the audio duration and set display time
        audio.onloadedmetadata = () => {
          setCurrentAudioDuration(audio.duration * 1000); // Convert to ms
          setDisplayTime(audio.duration * 1000); // Set display duration to match audio length
        };
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      setAudioPlaying(false);
    }
  }, [mute, speakText, handleManualNext]);

  useEffect(() => {
    if (mute) {
      stopAudio();
    } else if (currentWord && !audioPlaying) {
      // If sound is not playing and not muted, start playing the current word audio
      const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`;
      playAudio(fullText);
    }

    return () => {
      stopAudio(); // Cleanup the audio when component unmounts
    };
  }, [currentWord, mute, audioPlaying, playAudio]);

  const toggleMute = () => {
    setMute(!mute); // Toggle mute state
    if (!mute) {
      stopAudio(); // Stop playing if mute is activated
    }
  };

  return (
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
      {hasData && currentWord ? (
        <VocabularyCard
          word={currentWord.word}
          meaning={currentWord.meaning}
          example={currentWord.example}
          backgroundColor="#ffffff"
          isMuted={mute}
          isPaused={isPaused}
          voiceRegion={voiceRegion}
          onToggleMute={toggleMute}
          onTogglePause={handleTogglePause}
          onChangeVoice={handleChangeVoice}
          onSwitchCategory={() => handleSwitchCategory(mute, voiceRegion)}
          currentCategory={currentCategory}
          nextCategory={nextCategory}
          isSpeaking={audioPlaying}
          onNextWord={handleManualNext}
          displayTime={displayTime} // Now properly passed to VocabularyCard
        />
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;
