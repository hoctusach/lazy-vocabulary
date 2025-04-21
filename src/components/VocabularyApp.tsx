
import { useEffect } from 'react';
import VocabularyAppContainer from "./vocabulary-app/VocabularyAppContainer";
import { vocabularyService } from '@/services/vocabularyService';

const VocabularyApp = () => {
  // Force reload of default vocabulary when app loads
  useEffect(() => {
    console.log("VocabularyApp - forcing reload of default vocabulary");
    vocabularyService.loadDefaultVocabulary();
  }, []);
  
  return <VocabularyAppContainer />;
};

export default VocabularyApp;
