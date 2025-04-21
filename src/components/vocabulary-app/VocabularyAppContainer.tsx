// src/components/vocabulary-app/VocabularyAppContainer.tsx
import React, { useEffect } from "react";
import { useVocabularyManager } from "@/hooks/useVocabularyManager";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useWordSpeechSync } from "@/hooks/useWordSpeechSync";
import { vocabularyService } from "@/services/vocabularyService";
import VocabularyLayout from "@/components/VocabularyLayout";
import VocabularyCard from "@/components/VocabularyCard";
import WelcomeScreen from "@/components/WelcomeScreen";

const VocabularyAppContainer: React.FC = () => {
  const [speechError, setSpeechError] = React.useState<string | null>(null);

  // Detect if Web Speech API is unavailable
  useEffect(() => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      return;
    }
    if (!hasData || !currentWord || isPaused || isMuted) {
      return;
    }
    let cancelled = false;

    async function speakAndAdvance() {
      // 1) Wait for voices to load
      if (!isVoicesLoaded) {
        await new Promise<void>(resolve => {
          const interval = setInterval(() => {
            if (isVoicesLoaded) {
              clearInterval(interval);
              resolve();
            }
          }, 100);
        });
      }
      if (cancelled) return;

      // 2) Construct full text
      const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`;

      // 3) Speak, then advance
      try {
        await speakText(fullText);
      } catch (err) {
        console.error("Speech error:", err);
        setSpeechError("Cannot play audio at this moment.");
      }
      if (!cancelled) {
        handleManualNext();
      }
    }

    speakAndAdvance();

    return (
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
      {/* Display audio error if any */}
      {speechError && (
        <div className="mb-4 p-2 bg-red-100 text-red-800 rounded">
          {speechError}
        </div>
      )}

      () => {
      cancelled = true;
    };
  }, []);

  const {
  const {
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    handleSwitchCategory,
    setHasData,
    isSpeakingRef,
    isChangingWordRef
  } = useVocabularyManager();

  const {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded,
    speakingRef
  } = useSpeechSynthesis();

  const { speakCurrentWord, resetLastSpokenWord } = useWordSpeechSync(
    currentWord,
    isPaused,
    isMuted,
    isVoicesLoaded,
    speakText,
    isSpeakingRef,
    isChangingWordRef
  );

  const currentCategory = vocabularyService.getCurrentSheetName();
  const sheetOptions = vocabularyService.sheetOptions;
  const nextIndex =
    (sheetOptions.indexOf(currentCategory) + 1) % sheetOptions.length;
  const nextCategory = sheetOptions[nextIndex];

  // Speak and advance: on each new word, speak it then go next
  useEffect(() => {
    if (!hasData || !currentWord || isPaused || isMuted || !isVoicesLoaded) {
      return;
    }

    let cancelled = false;

    // Ensure any prior speech state is reset
    resetLastSpokenWord();

    // Speak the full text (word, meaning, example)
    speakCurrentWord(true)
      .then(() => {
        if (!cancelled) {
          handleManualNext();
        }
      })
      .catch(err => console.error('Speech error:', err));

    return () => {
      cancelled = true;
    };
  }, [
    currentWord,
    hasData,
    isPaused,
    isMuted,
    isVoicesLoaded,
    speakCurrentWord,
    handleManualNext,
    resetLastSpokenWord
  ]);

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
          isSpeaking={speakingRef.current}
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
