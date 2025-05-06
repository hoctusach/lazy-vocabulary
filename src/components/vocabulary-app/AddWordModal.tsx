
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from 'lucide-react';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newWord: { word: string; meaning: string; example: string; category: string }) => void;
}

const CATEGORY_OPTIONS = [
  { value: "phrasal verbs", label: "Phrasal Verbs" },
  { value: "idioms", label: "Idioms" },
  { value: "advanced words", label: "Advanced Words" }
];

const AddWordModal: React.FC<AddWordModalProps> = ({ isOpen, onClose, onSave }) => {
  const [word, setWord] = useState<string>('');
  const [meaning, setMeaning] = useState<string>('');
  const [example, setExample] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  
  // New state for dictionary API integration
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>('');

  useEffect(() => {
    // Check if all fields have values
    setIsFormValid(!!word && !!meaning && !!example && !!category);
  }, [word, meaning, example, category]);

  const handleSave = () => {
    if (isFormValid) {
      onSave({
        word,
        meaning,
        example,
        category
      });
      // Reset form
      setWord('');
      setMeaning('');
      setExample('');
      setCategory('');
      setSearchError('');
      onClose();
    }
  };
  
  const handleSearch = async () => {
    if (!word.trim()) {
      setSearchError('Please enter a word to search');
      return;
    }
    
    try {
      setIsSearching(true);
      setSearchError('');
      
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim())}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch definition');
      }
      
      const data = await response.json();
      
      if (data && data[0] && data[0].meanings && data[0].meanings[0]) {
        // Get first definition
        const firstDefinition = data[0].meanings[0].definitions[0];
        
        if (firstDefinition) {
          // Populate meaning field
          setMeaning(firstDefinition.definition || '');
          
          // Populate example if available
          if (firstDefinition.example) {
            setExample(firstDefinition.example);
          }
        }
      } else {
        setSearchError('No definition found');
      }
    } catch (error) {
      console.error('Dictionary API error:', error);
      setSearchError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Vocabulary Word</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="word" className="text-right">
              Word
            </Label>
            <div className="col-span-3 flex gap-2">
              <Input
                id="word"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                className="flex-grow"
                disabled={isSearching}
                aria-disabled={isSearching}
              />
              <Button 
                type="button" 
                onClick={handleSearch}
                disabled={isSearching || !word.trim()}
                aria-busy={isSearching}
                className="shrink-0"
              >
                {isSearching ? <Loader className="h-4 w-4 animate-spin mr-1" /> : 'Search'}
              </Button>
            </div>
          </div>
          
          {searchError && (
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-start-2 col-span-3">
                <p className="text-sm text-destructive" aria-live="polite">{searchError}</p>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="meaning" className="text-right">
              Meaning
            </Label>
            <Input
              id="meaning"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              className="col-span-3"
              disabled={isSearching}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="example" className="text-right">
              Example
            </Label>
            <Input
              id="example"
              value={example}
              onChange={(e) => setExample(e.target.value)}
              className="col-span-3"
              disabled={isSearching}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <div className="col-span-3">
              <Select value={category} onValueChange={setCategory} disabled={isSearching}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button type="submit" disabled={!isFormValid || isSearching} onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddWordModal;
