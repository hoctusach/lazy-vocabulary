import React, { useEffect, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader, Search, Volume2 } from 'lucide-react';
import { VocabularyWord } from '@/types/vocabulary';
import { Badge } from '@/components/ui/badge';
import parseWordAnnotations from '@/utils/text/parseWordAnnotations';

interface WordSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WordSearchModal: React.FC<WordSearchModalProps> = ({ isOpen, onClose }) => {
  const fuseRef = useRef<Fuse<VocabularyWord> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<Fuse.FuseResult<VocabularyWord>[]>([]);
  const [selectedWord, setSelectedWord] = useState<VocabularyWord | null>(null);

  useEffect(() => {
    if (isOpen && !fuseRef.current && !loading) {
      setLoading(true);
      import('@/utils/allWords')
        .then(mod => mod.loadFuse())
        .then(fuse => {
          fuseRef.current = fuse;
          setLoading(false);
          setLoadError('');
        })
        .catch(err => {
          console.error(err);
          setLoadError('Failed to load vocabulary');
          setLoading(false);
        });
    }
  }, [isOpen, loading]);

  const highlightMatch = (
    text: string,
    match: Fuse.FuseResultMatch | undefined
  ) => {
    if (!match || !match.indices.length) return text;
    const elements: React.ReactNode[] = [];
    let last = 0;
    match.indices.forEach(([start, end], idx) => {
      if (last < start) elements.push(text.slice(last, start));
      elements.push(
        <mark key={idx} className="bg-yellow-200">
          {text.slice(start, end + 1)}
        </mark>
      );
      last = end + 1;
    });
    if (last < text.length) elements.push(text.slice(last));
    return <>{elements}</>;
  };

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!fuseRef.current || !debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    setResults(fuseRef.current.search(debouncedQuery));
  }, [debouncedQuery]);

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
          {loading && !fuseRef.current && (
            <div className="flex justify-center py-4" aria-label="loading">
              <Loader className="h-4 w-4 animate-spin" />
            </div>
          )}
          {loadError && <p className="p-2 text-sm text-destructive">{loadError}</p>}
          {results.map(({ item, matches }) => (
            <div
              key={`${item.word}-${item.category}`}
              className="px-2 py-1 cursor-pointer hover:bg-accent flex justify-between"
              onClick={() => setSelectedWord(item)}
            >
              <span className="mr-2 flex-1">
                {highlightMatch(item.word, matches?.find(m => m.key === 'word'))}
              </span>
              {item.category && (
                <Badge variant="secondary" className="shrink-0">
                  {item.category}
                </Badge>
              )}
            </div>
          ))}
          {results.length === 0 && debouncedQuery.trim() && !loading && !loadError && (
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
