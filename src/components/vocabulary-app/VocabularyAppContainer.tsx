import React, { useEffect, useState, useRef, useCallback } from "react";
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
    setHasData,
  } = useVocabularyManager();

  const {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded,
  } = useSpeechSynthesis();

  const [speechError, setSpeechError] = useState(false); // To track if there's an issue with speech
  const [isSpeaking, setIsSpeaking] = useState(false); // Track if a word is being spoken
  const [currentWordIndex, setCurrentWordIndex] = useState(0); // To track the current word index

  const wordQueueRef = useRef<number[]>([]); // Queue to manage words
  const isSpeakingRef = useRef(false); // To prevent overlapping speech

  const currentCategory = vocabularyService.getCurrentSheetName();
  const sheetOptions = vocabularyService.sheetOptions;
  const nextIndex = (sheetOptions.indexOf(currentCategory) + 1) % sheetOptions.length;
  const nextCategory = sheetOptions[nextIndex];

  const speakAndAdvance = useCallback(async () => {
    if (!hasData || isPaused || isMuted || !isVoicesLoaded) {
      setSpeechError(true);
      return;
    }

    const wordData = vocabularyService.getNextWord();

    if (wordData) {
      const fullText = `${wordData.word}. ${wordData.meaning}. ${wordData.example}`;
      try {
        setIsSpeaking(true);
        await speakText(fullText); // Speak the word, meaning, and example
        setIsSpeaking(false);
        handleManualNext(); // Proceed to the next word after this one finishes
      } catch (error) {
        console.error("Speech error:", error);
        setSpeechError(true);
      }
    }
  }, [hasData, isPaused, isMuted, isVoicesLoaded, speakText, handleManualNext]);

  // Display the word and wait for the speech to complete before moving to the next word
  useEffect(() => {
    if (!hasData || !currentWord || isPaused || isMuted || !isVoicesLoaded) {
      return;
    }

    speakAndAdvance();
  }, [currentWord, hasData, isPaused, isMuted, isVoicesLoaded, speakAndAdvance]);

  // Handle automatic word change based on speech completion
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSpeaking && !isPaused && !isMuted && currentWord) {
        speakAndAdvance(); // Trigger the next word to be spoken
      }
    }, 1000); // Check every second for the next word to be spoken

    return () => clearInterval(interval);
  }, [isSpeaking, isPaused, isMuted, currentWord, speakAndAdvance]);

  return (
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
      {hasData && currentWord ? (
        <VocabularyCard
          word={currentWord.word}
          meaning={currentWord.meaning}
          example={currentWord.example}
          backgroundColor="#ffffff"
          isMuted={isMuted}
          isPaused={isPaused}
          voiceRegion={voiceRegion}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onChangeVoice={handleChangeVoice}
          onSwitchCategory={() => handleSwitchCategory(isMuted, voiceRegion)}
          currentCategory={currentCategory}
          nextCategory={nextCategory}
          isSpeaking={isSpeaking}
          onNextWord={handleManualNext}
        />
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;



// import React, { useEffect, useCallback } from "react";
// import { useVocabularyManager } from "@/hooks/useVocabularyManager";
// import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
// import { useWordSpeechSync } from "@/hooks/useWordSpeechSync";
// import { vocabularyService } from "@/services/vocabularyService";
// import VocabularyCard from "@/components/VocabularyCard";
// import WelcomeScreen from "@/components/WelcomeScreen";
// import VocabularyLayout from "@/components/VocabularyLayout";
// import { useBackgroundColor } from "./useBackgroundColor";
// import { useVocabularyAppHandlers } from "./useVocabularyAppHandlers";

// const VocabularyAppContainer: React.FC = () => {
//   // Flags and simple handlers
//   const {
//     hasData,
//     currentWord,
//     isPaused,
//     handleFileUploaded,
//     handleTogglePause,
//     handleManualNext,
//     handleSwitchCategory,
//     setHasData,
//     isSpeakingRef,
//     isChangingWordRef
//   } = useVocabularyManager();

//   const {
//     isMuted,
//     voiceRegion,
//     speakText,
//     handleToggleMute,
//     handleChangeVoice,
//     isVoicesLoaded
//   } = useSpeechSynthesis();

//   const {
//     speakCurrentWord,
//     resetLastSpokenWord,
//     wordFullySpoken
//   } = useWordSpeechSync(
//     currentWord,
//     isPaused,
//     isMuted,
//     isVoicesLoaded,
//     speakText,
//     isSpeakingRef,
//     isChangingWordRef
//   );

//   const { backgroundColor, backgroundColors, setBackgroundColorIndex } = useBackgroundColor();

//   const currentSheetName = vocabularyService.getCurrentSheetName();
//   const sheetOptions = vocabularyService.sheetOptions;
//   const nextSheetIndex = (sheetOptions.indexOf(currentSheetName) + 1) % sheetOptions.length;
//   const nextSheetName = sheetOptions[nextSheetIndex];

//   const {
//     handleToggleMuteWithSpeaking,
//     handleChangeVoiceWithSpeaking,
//     handleSwitchCategoryWithState
//   } = useVocabularyAppHandlers({
//     isSpeakingRef,
//     isChangingWordRef,
//     resetLastSpokenWord,
//     speakCurrentWord,
//     handleToggleMute,
//     handleChangeVoice,
//     handleSwitchCategory,
//     voiceRegion,
//     setBackgroundColorIndex,
//     backgroundColors
//   });

//   // Advance whenever a word finishes speaking
//   useEffect(() => {
//     if (wordFullySpoken && !isPaused && !isMuted) {
//       handleManualNext();
//     }
//   }, [wordFullySpoken, isPaused, isMuted, handleManualNext]);

//   return (
//     <VocabularyLayout hasData={hasData}>
//       {hasData && currentWord ? (
//         <VocabularyCard
//           word={currentWord.word}
//           meaning={currentWord.meaning}
//           example={currentWord.example}
//           backgroundColor={backgroundColor}
//           isMuted={isMuted}
//           isPaused={isPaused}
//           voiceRegion={voiceRegion}
//           onToggleMute={handleToggleMuteWithSpeaking}
//           onTogglePause={handleTogglePause}
//           onChangeVoice={handleChangeVoiceWithSpeaking}
//           onSwitchCategory={handleSwitchCategoryWithState}
//           currentCategory={currentSheetName}
//           nextCategory={nextSheetName}
//           isSpeaking={isSpeakingRef.current}
//           onNextWord={handleManualNext}
//         />
//       ) : (
//         <WelcomeScreen onFileUploaded={handleFileUploaded} />
//       )}
//     </VocabularyLayout>
//   );
// };

// export default VocabularyAppContainer;
