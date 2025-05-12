
import { useEffect } from 'react';
import VocabularyAppContainer from "./vocabulary-app/VocabularyAppContainer";
import { vocabularyService } from '@/services/vocabularyService';
import ToastProvider from './vocabulary-app/ToastProvider';
import { useUser } from '@/contexts/UserContext';

const VocabularyApp = () => {
  const { user } = useUser();
  
  // Force reload of default vocabulary when app loads
  useEffect(() => {
    if (user) {
      console.log(`VocabularyApp - loading vocabulary data for user: ${user.userId}`);
      // In a real app, you might fetch user-specific vocabulary data from a database here
      // vocabularyService.loadUserVocabulary(user.userId);
      vocabularyService.loadDefaultVocabulary();
    }
  }, [user]);
  
  return (
    <>
      <ToastProvider />
      <VocabularyAppContainer />
    </>
  );
};

export default VocabularyApp;
