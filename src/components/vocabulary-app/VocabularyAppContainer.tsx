// src/components/vocabulary-app/VocabularyAppContainer.tsx
import React, { useEffect, useState } from "react";
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

  const [speechError, setSpeechError] = useState<string | null>(null);

  // Determine categories
  const currentCategory = vocabularyService.getCurrentSheetName();
  const sheetOptions = vocabularyService.sheetOptions;
  const nextIndex = (sheetOptions.indexOf(currentCategory) + 1) % sheetOptions.length;
  const nextCategory = sheetOptions[nextIndex];

  // Check for speech synthesis support
  useEffect(() => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setSpeechError(
        'Audio service is unavailable in your browser.'
      );
    }
  }, []);

  // Speak word + meaning + example, then advance
  useEffect(() => {
    if (!hasData || !currentWord || isPaused || isMuted) {
      return;
    }
    let cancelled = false;

    async function speakAndNext() {
      try {
        // wait for voices loaded
        if (!isVoicesLoaded) {
          await new Promise<void>((resolve) => {
            const interval = setInterval(() => {
              if (isVoicesLoaded) {
                clearInterval(interval);
                resolve();
              }
            }, 100);
          });
        }
        if (cancelled) return;

        const fullText =
          `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`;

        await speakText(fullText);
      } catch (err) {
        console.error('Speech error:', err);
        setSpeechError('Audio service error.');
      }
      if (!cancelled) {
        handleManualNext();
      }
    }

    speakAndNext();

    return () => {
      cancelled = true;
    };
  }, [
    hasData,
    currentWord,
    isPaused,
    isMuted,
    isVoicesLoaded,
    speakText,
    handleManualNext
  ]);

  return (
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
      {/* show error banner if speech unavailable */}
      {speechError && (
        <div className="mb-4 p-2 bg-red-100 text-red-800 rounded">
          {speechError}
        </div>
      )}

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
          isSpeaking={false}
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
