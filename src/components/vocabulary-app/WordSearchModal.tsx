import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Volume2 } from 'lucide-react';
import { vocabularyService } from '@/services/vocabularyService';
import { VocabularyWord } from '@/types/vocabulary';
import parseWordAnnotations from '@/utils/text/parseWordAnnotations';

interface WordSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WordSearchModal: React.FC<WordSearchModalProps> = ({ isOpen, onClose }) => {
  const wordList = vocabularyService.getWordList();
  const [query, setQuery] = useState('');
  const [selectedWord, setSelectedWord] = useState<VocabularyWord | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as VocabularyWord[];
    return wordList.filter(w => w.word.toLowerCase().includes(q));
  }, [query, wordList]);

  const handlePlay = () => {
    if (!selectedWord) return;
    const text = [selectedWord.word, selectedWord.meaning, selectedWord.example]
      .filter(Boolean)
      .join('. ');
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const handleClose = () => {
    setQuery('');
    setSelectedWord(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Quick Search</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 items-center">
          <Input
            placeholder="Search word..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') e.preventDefault();
            }}
          />
          <Button size="icon" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-40 mt-3 border rounded-md">
          {results.map((word) => (
            <div
              key={word.word}
              className="px-2 py-1 cursor-pointer hover:bg-accent"
              onClick={() => setSelectedWord(word)}
            >
              {word.word}
            </div>
          ))}
          {results.length === 0 && query.trim() && (
            <p className="p-2 text-sm text-muted-foreground">No results</p>
          )}
        </ScrollArea>

        {selectedWord && (
          <div className="mt-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">
                  {parseWordAnnotations(selectedWord.word).main}
                </h3>
                <p className="text-sm text-gray-500">
                  {parseWordAnnotations(selectedWord.word).annotations.join(' ')}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={handlePlay} title="Play">
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-green-700 italic text-sm">{selectedWord.meaning}</p>
            <p className="text-red-700 italic text-sm">{selectedWord.example}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WordSearchModal;
