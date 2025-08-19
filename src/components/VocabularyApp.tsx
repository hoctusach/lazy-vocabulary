
import { useEffect } from 'react';
import VocabularyAppContainerNew from "./vocabulary-app/VocabularyAppContainerNew";
import { vocabularyService } from '@/services/vocabularyService';
import ToastProvider from './vocabulary-app/ToastProvider';

const VocabularyApp = () => {
  useEffect(() => {
    const load = async () => {
      if (!vocabularyService.hasData()) {
        console.log("VocabularyApp - loading default vocabulary");
        await vocabularyService.loadDefaultVocabulary();
      }
    };
    load();
  }, []);
  
  return (
    <>
      <ToastProvider />
      <VocabularyAppContainerNew />
    </>
  );
};

export default VocabularyApp;
