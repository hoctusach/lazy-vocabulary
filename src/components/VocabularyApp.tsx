
import { useEffect } from 'react';
import VocabularyAppContainerNew from "./vocabulary-app/VocabularyAppContainerNew";
import { vocabularyService } from '@/services/vocabularyService';
import ToastProvider from './vocabulary-app/ToastProvider';
import { useUserAuth } from '@/hooks/useUserAuth';

const VocabularyApp = () => {
  const { isLoggedIn } = useUserAuth();
  
  // Force reload of default vocabulary when app loads
  useEffect(() => {
    console.log("VocabularyApp - forcing reload of default vocabulary");
    vocabularyService.loadDefaultVocabulary();
  }, []);
  
  return (
    <>
      <ToastProvider />
      <VocabularyAppContainerNew isAudioEnabled={isLoggedIn} />
    </>
  );
};

export default VocabularyApp;
