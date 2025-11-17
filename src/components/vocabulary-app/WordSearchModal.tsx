import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import VocabularyCard from './VocabularyCard';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { findVoice } from '@/hooks/vocabulary-playback/speech-playback/findVoice';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { cleanSpeechText } from '@/utils/speech';
import { trackUiInteraction, trackWordSearch } from '@/services/analyticsService';

interface WordSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}


interface VocabularySearchResult {
  word_id: string;
  word: string;
  category: string | null;
  meaning: string;
  example: string;
  translation: string | null;
  match_rank: number;
}


const WordSearchModal: React.FC<WordSearchModalProps> = ({ isOpen, onClose, initialQuery = '' }) => {
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [results, setResults] = useState<VocabularySearchResult[]>([]);
  const [selectedWord, setSelectedWord] = useState<VocabularySearchResult | null>(null);
  const [noResults, setNoResults] = useState(false);
  const previewVoice: VoiceSelection = {
    label: 'US',
    region: 'US',
    gender: 'female',
    index: 0
  };

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setDebouncedQuery(initialQuery);
      setSelectedWord(null);
      setResults([]);
      setNoResults(false);
      setLoading(false);
      trackUiInteraction('search_modal_viewed', {
        context: { has_initial_query: Boolean(initialQuery) },
      });
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(id);
  }, [query, isOpen]);

  const highlightMatch = (text: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return text;

    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    try {
      const regex = new RegExp(`(${escapeRegExp(trimmedQuery)})`, 'ig');
      const parts = text.split(regex);
      if (parts.length === 1) return text;

      return (
        <>
          {parts.map((part, index) =>
            index % 2 === 1 ? (
              <mark key={`${part}-${index}`} className="bg-yellow-200">
                {part}
              </mark>
            ) : (
              <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
            )
          )}
        </>
      );
    } catch (error) {
      console.error('Failed to highlight search match', error);
      return text;
    }
  };

  // Clear any selected word when the search query changes
  useEffect(() => {
    if (selectedWord) {
      setSelectedWord(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const currentQuery = debouncedQuery;
    const trimmed = currentQuery.trim();

    if (!trimmed) {
      setResults([]);
      setSelectedWord(null);
      setLoading(false);
      setNoResults(false);
      return;
    }

    let isCancelled = false;

    const fetchResults = async () => {
      const startedAt = typeof performance !== 'undefined' ? performance.now() : null;
      setLoading(true);
      setResults([]);
      setSelectedWord(null);
      setNoResults(false);
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.rpc('search_vocabulary', {
          p_query: trimmed.toLowerCase(),
        });

        if (isCancelled) return;

        if (error) {
          console.error('Failed to fetch vocabulary search results', error);
          setNoResults(true);
          trackWordSearch({
            query: trimmed,
            resultCount: 0,
            source: 'modal_error',
            durationMs:
              startedAt != null && typeof performance !== 'undefined'
                ? Math.round(performance.now() - startedAt)
                : null,
          });
          return;
        }

        const nextResults = Array.isArray(data) ? data : [];
        if (nextResults.length === 0) {
          setNoResults(true);
          trackWordSearch({
            query: trimmed,
            resultCount: 0,
            source: 'modal',
            durationMs:
              startedAt != null && typeof performance !== 'undefined'
                ? Math.round(performance.now() - startedAt)
                : null,
          });
          return;
        }

        setResults(nextResults);
        setNoResults(false);
        trackWordSearch({
          query: trimmed,
          resultCount: nextResults.length,
          source: 'modal',
          durationMs:
            startedAt != null && typeof performance !== 'undefined'
              ? Math.round(performance.now() - startedAt)
              : null,
        });
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to fetch vocabulary search results', err);
          setResults([]);
          setSelectedWord(null);
          setNoResults(true);
          trackWordSearch({
            query: trimmed,
            resultCount: 0,
            source: 'modal_exception',
            durationMs:
              startedAt != null && typeof performance !== 'undefined'
                ? Math.round(performance.now() - startedAt)
                : null,
          });
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchResults();

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const normalizedInitial = initialQuery.trim().toLowerCase();
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedInitial || normalizedInitial !== normalizedQuery) return;
    if (!results.length || selectedWord) return;

    const matchedResult =
      results.find((item) => item.word.trim().toLowerCase() === normalizedInitial) ?? results[0];

    if (matchedResult) {
      setSelectedWord(matchedResult);
    }
  }, [initialQuery, isOpen, query, results, selectedWord]);

  const handlePlay = () => {
    if (!selectedWord) return;
    const text = [selectedWord.word, selectedWord.meaning, selectedWord.example]
      .filter(Boolean)
      .join('. ');
    const sanitized = cleanSpeechText(text);
    const speechText = sanitized || text;
    const utterance = new SpeechSynthesisUtterance(speechText);
    const voices = window.speechSynthesis.getVoices();
    const voice = findVoice(voices, previewVoice);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = previewVoice.region === 'US' ? 'en-US' : 'en-GB';
    }
    const debugWindow = window as Window & { DEBUG_SPEECH?: boolean };
    if (debugWindow.DEBUG_SPEECH) {
      console.debug('[Speech] Speaking:', utterance.text);
    }
    trackUiInteraction('search_preview_play', { label: selectedWord.word });
    window.speechSynthesis.speak(utterance);
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      return;
    }

    const isSpaceKey =
      event.key === ' ' ||
      event.key === 'Spacebar' ||
      event.code === 'Space';

    if (isSpaceKey) {
      event.stopPropagation();
    }
  };

  const handleClose = () => {
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
    setSelectedWord(null);
    setNoResults(false);
    setLoading(false);
    onClose();
  };

  const handleSelectWord = (item: VocabularySearchResult) => {
    trackUiInteraction('search_result_selected', {
      label: item.word,
      context: { category: item.category, match_rank: item.match_rank },
    });
    setSelectedWord(item);
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
            onKeyDown={handleInputKeyDown}
          />
          <Button
            size="icon"
            variant="outline"
            aria-label="Search"
            onClick={() => setDebouncedQuery(query)}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 space-y-3">
          <ScrollArea className="h-40 border rounded-md">
            {loading && (
              <div className="flex justify-center py-4" aria-label="loading">
                <Loader className="h-4 w-4 animate-spin" />
              </div>
            )}
            {results.map((item) => {
              const isSelected = selectedWord?.word_id === item.word_id;
              return (
                <div
                  key={item.word_id}
                  className={`px-2 py-1 cursor-pointer flex justify-between ${
                    isSelected ? 'bg-accent/80' : 'hover:bg-accent'
                  }`}
                  onClick={() => handleSelectWord(item)}
                >
                  <span className="mr-2 flex-1 font-medium text-slate-800">
                    {highlightMatch(item.word)}
                  </span>
                  {item.category && (
                    <Badge variant={isSelected ? 'default' : 'secondary'} className="shrink-0">
                      {item.category}
                    </Badge>
                  )}
                </div>
              );
            })}
          </ScrollArea>

          {noResults && debouncedQuery.trim() && !loading && (
            <div>
              <p className="italic text-sm" style={{ color: 'var(--lv-helper-text)' }}>
                No results found.
              </p>
            </div>
          )}

          {!loading && results.length > 0 && !selectedWord && (
            <p className="text-sm" style={{ color: 'var(--lv-helper-text)' }}>
              Select a word to view its details.
            </p>
          )}

          {selectedWord && (
            <div className="space-y-2">
              <VocabularyCard
                word={selectedWord.word}
                meaning={selectedWord.meaning}
                example={selectedWord.example}
                translation={selectedWord.translation ?? undefined}
                backgroundColor="var(--lv-card-bg)"
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WordSearchModal;
