
import { useEffect } from 'react';
import VocabularyAppContainerNew from "./vocabulary-app/VocabularyAppContainerNew";
import { vocabularyService } from '@/services/vocabularyService';
import ToastProvider from './vocabulary-app/ToastProvider';
import AudioPermissionPrompt from './vocabulary-app/AudioPermissionPrompt';

const VocabularyApp = () => {
  // Force reload of default vocabulary when app loads
  useEffect(() => {
    console.log("VocabularyApp - forcing reload of default vocabulary");
    vocabularyService.loadDefaultVocabulary();
  }, []);
  
  return (
    <>
      <ToastProvider />
      <AudioPermissionPrompt />
      <VocabularyAppContainerNew />
    </>
  );
};

export default VocabularyApp;
