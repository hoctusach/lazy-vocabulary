
import { useEffect } from 'react';
import VocabularyAppContainer from "./vocabulary-app/VocabularyAppContainer";
import { vocabularyService } from '@/services/vocabularyService';
import ToastProvider from './vocabulary-app/ToastProvider';

const VocabularyApp = () => {
  // Force reload of default vocabulary when app loads
  useEffect(() => {
    console.log("VocabularyApp - forcing reload of default vocabulary");
    vocabularyService.loadDefaultVocabulary();
  }, []);
  
  return (
    <>
      <ToastProvider />
      <VocabularyAppContainer />
    </>
  );
};

export default VocabularyApp;
