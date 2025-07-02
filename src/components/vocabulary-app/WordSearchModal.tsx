import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader, Search } from 'lucide-react';
import { VocabularyWord } from '@/types/vocabulary';
import { Badge } from '@/components/ui/badge';
import VocabularyCard from './VocabularyCard';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { findVoice } from '@/hooks/vocabulary-playback/speech-playback/findVoice';

interface WordSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WordSearchModal: React.FC<WordSearchModalProps> = ({ isOpen, onClose }) => {
  const wordsRef = useRef<VocabularyWord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<VocabularyWord[]>([]);
  const [selectedWord, setSelectedWord] = useState<VocabularyWord | null>(null);
  const previewVoice: VoiceSelection = {
    label: 'US',
    region: 'US',
    gender: 'female',
    index: 0
  };

  useEffect(() => {
    if (isOpen && !wordsRef.current && !loading) {
      setLoading(true);
      import('@/utils/allWords')
        .then(async mod => {
          await mod.loadAllWords();
          wordsRef.current = mod.allWords || [];
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

  const highlightMatch = (text: string) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return text;

    const regex = new RegExp(`\\b${normalized}\\b`, 'i');
    const match = text.match(regex);
    if (!match || match.index === undefined) return text;

    const idx = match.index;
    const matchText = match[0];

    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200">{matchText}</mark>
        {text.slice(idx + matchText.length)}
      </>
    );
  };

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (selectedWord) {
      setSelectedWord(null);
    }
  }, [query]);

  useEffect(() => {
    if (!wordsRef.current) return;

    const normalized = debouncedQuery.trim().toLowerCase();
    if (normalized === '') {
      setResults([]);
      setSelectedWord(null);
      return;
    }

    const filtered = wordsRef.current.filter(w =>
      w.word
        .split(/\s+/)
        .some(part => part.toLowerCase() === normalized)
    );

    setResults(filtered);
  }, [debouncedQuery]);

  const handlePlay = () => {
    if (!selectedWord) return;
    const text = [selectedWord.word, selectedWord.meaning, selectedWord.example]
      .filter(Boolean)
      .join('. ');
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const voice = findVoice(voices, previewVoice);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = previewVoice.region === 'US' ? 'en-US' : 'en-GB';
    }
    window.speechSynthesis.speak(utterance);
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (value.trim() === '') {
      setResults([]);
      setSelectedWord(null);
    }
  };

  const handleClose = () => {
    setQuery('');
    setSelectedWord(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] top-[5%] sm:top-[10%] md:top-1/2 translate-y-0 md:translate-y-[-50%]"
      >
        <DialogHeader>
          <DialogTitle>Quick Search</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 items-center">
          <Input
            placeholder="Search word..."
            value={query}
            onChange={e => handleInputChange(e.target.value)}
            onKeyUp={e => handleInputChange((e.target as HTMLInputElement).value)}
            onKeyDown={e => {
              if (e.key === 'Enter') e.preventDefault();
            }}
          />
          <Button size="icon" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {!selectedWord ? (
          <ScrollArea className="h-40 mt-3 border rounded-md">
            {loading && !wordsRef.current && (
              <div className="flex justify-center py-4" aria-label="loading">
                <Loader className="h-4 w-4 animate-spin" />

              </div>
            )}
            {loadError && (
              <p className="p-2 text-sm text-destructive">{loadError}</p>
            )}
            {results.map((item) => (
              <div
                key={`${item.word}-${item.category}`}
                className="px-2 py-1 cursor-pointer hover:bg-accent flex justify-between"
                onClick={() => setSelectedWord(item)}
              >
                <span className="mr-2 flex-1">
                  {highlightMatch(item.word)}
                </span>
                {item.category && (
                  <Badge variant="secondary" className="shrink-0">
                    {item.category}
                  </Badge>
                )}
              </div>
            ))}
            {results.length === 0 &&
              debouncedQuery.trim() &&
              !loading &&
              !loadError && (
                <p className="p-2 text-sm text-muted-foreground">No results</p>
              )}
          </ScrollArea>
        ) : (
          <div className="mt-3 space-y-2">
            <VocabularyCard
              word={selectedWord.word}
              meaning={selectedWord.meaning}
              example={selectedWord.example}
              backgroundColor="#ffffff"
              isMuted={false}
              isPaused={false}
              onToggleMute={() => {}}
              onTogglePause={() => {}}
              onCycleVoice={() => {}}
              onSwitchCategory={() => {}}
              onNextWord={() => {}}
              currentCategory={selectedWord.category || ''}
              nextCategory=""
              selectedVoice={previewVoice}
              nextVoiceLabel=""
              searchPreview={true}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WordSearchModal;
