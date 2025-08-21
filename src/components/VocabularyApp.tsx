
import React, { useEffect, useState } from 'react';
import VocabularyAppContainerNew from "./vocabulary-app/VocabularyAppContainerNew";
import { vocabularyService } from '@/services/vocabularyService';
import ToastProvider from './vocabulary-app/ToastProvider';
import WordSearchModal from './vocabulary-app/WordSearchModal';
import { normalizeQuery } from '@/utils/text/normalizeQuery';
import { toast } from 'sonner';

const VocabularyApp = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchWord, setSearchWord] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!vocabularyService.hasData()) {
        console.log("VocabularyApp - loading default vocabulary");
        await vocabularyService.loadDefaultVocabulary();
      }
    };
    load();
  }, []);

  const openSearch = (word?: string) => {
    const normalized = normalizeQuery(word || '');
    if (word && normalized === '') {
      toast.warning('Please enter a valid search query.');
      return;
    }
    setSearchWord(normalized);
    setIsSearchOpen(true);
  };
  
  return (
    <>
      <ToastProvider />
      <VocabularyAppContainerNew onOpenSearch={openSearch} />
      <WordSearchModal
        isOpen={isSearchOpen}
        initialQuery={searchWord}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
};

export default VocabularyApp;
