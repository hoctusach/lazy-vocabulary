
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader } from 'lucide-react';
import { htmlEncode } from '@/utils/security/contentSecurity';

interface WordSearchSectionProps {
  word: string;
  onWordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch: () => void;
  isSearching: boolean;
  searchError: string;
  editMode: boolean;
}

const WordSearchSection: React.FC<WordSearchSectionProps> = ({
  word,
  onWordChange,
  onSearch,
  isSearching,
  searchError,
  editMode
}) => {
  return (
    <>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="word" className="text-right">
          Word
        </Label>
        <div className="col-span-3 flex gap-2">
          <Input
            id="word"
            value={word}
            onChange={onWordChange}
            className="flex-grow"
            disabled={isSearching}
            aria-disabled={isSearching}
            maxLength={100}
          />
          {!editMode && (
            <Button
              type="button"
              onClick={onSearch}
              disabled={isSearching || !word.trim()}
              aria-busy={isSearching}
              className="shrink-0 px-1.5"
            >
              {isSearching ? <Loader className="h-4 w-4 animate-spin mr-1" /> : 'Go'}
            </Button>
          )}
        </div>
      </div>
      
      {searchError && (
        <div className="grid grid-cols-4 items-center gap-4">
          <div className="col-start-2 col-span-3">
            <p className="text-sm text-destructive" aria-live="polite">{htmlEncode(searchError)}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default WordSearchSection;
