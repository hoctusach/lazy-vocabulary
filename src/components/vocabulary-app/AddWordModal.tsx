
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateVocabularyWord, validateMeaning, validateExample, RateLimiter } from '@/utils/security/inputValidation';
import { htmlEncode, isValidUrl } from '@/utils/security/contentSecurity';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newWord: { word: string; meaning: string; example: string; category: string }) => void;
  editMode?: boolean;
  wordToEdit?: { word: string; meaning: string; example: string; category: string };
}

const CATEGORY_OPTIONS = [
  { value: "phrasal verbs", label: "Phrasal Verbs" },
  { value: "idioms", label: "Idioms" },
  { value: "advanced words", label: "Advanced Words" }
];

// Rate limiter for API calls
const searchRateLimiter = new RateLimiter(5, 60000); // 5 searches per minute

const AddWordModal: React.FC<AddWordModalProps> = ({ isOpen, onClose, onSave, editMode = false, wordToEdit }) => {
  const [word, setWord] = useState<string>('');
  const [meaning, setMeaning] = useState<string>('');
  const [example, setExample] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  
  // Search state
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>('');
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Pre-populate form when in edit mode
  useEffect(() => {
    if (editMode && wordToEdit) {
      // Sanitize input when loading for edit
      const wordValidation = validateVocabularyWord(wordToEdit.word);
      const meaningValidation = validateMeaning(wordToEdit.meaning);
      const exampleValidation = validateExample(wordToEdit.example);
      
      setWord(wordValidation.sanitizedValue || wordToEdit.word);
      setMeaning(meaningValidation.sanitizedValue || wordToEdit.meaning);
      setExample(exampleValidation.sanitizedValue || wordToEdit.example);
      setCategory(wordToEdit.category);
    } else if (!editMode) {
      // Reset form when not in edit mode
      setWord('');
      setMeaning('');
      setExample('');
      setCategory('');
      setValidationErrors([]);
    }
  }, [editMode, wordToEdit, isOpen]);

  // Validate form inputs
  useEffect(() => {
    const errors: string[] = [];
    
    if (word) {
      const wordValidation = validateVocabularyWord(word);
      if (!wordValidation.isValid) {
        errors.push(...wordValidation.errors.map(err => `Word: ${err}`));
      }
    }
    
    if (meaning) {
      const meaningValidation = validateMeaning(meaning);
      if (!meaningValidation.isValid) {
        errors.push(...meaningValidation.errors.map(err => `Meaning: ${err}`));
      }
    }
    
    if (example) {
      const exampleValidation = validateExample(example);
      if (!exampleValidation.isValid) {
        errors.push(...exampleValidation.errors.map(err => `Example: ${err}`));
      }
    }
    
    setValidationErrors(errors);
    setIsFormValid(!!word && !!meaning && !!example && !!category && errors.length === 0);
  }, [word, meaning, example, category]);

  const handleSave = () => {
    if (isFormValid) {
      // Final validation and sanitization before save
      const wordValidation = validateVocabularyWord(word);
      const meaningValidation = validateMeaning(meaning);
      const exampleValidation = validateExample(example);
      
      if (wordValidation.isValid && meaningValidation.isValid && exampleValidation.isValid) {
        onSave({
          word: wordValidation.sanitizedValue!,
          meaning: meaningValidation.sanitizedValue!,
          example: exampleValidation.sanitizedValue!,
          category
        });
        
        // Reset form
        setWord('');
        setMeaning('');
        setExample('');
        setCategory('');
        setSearchError('');
        setValidationErrors([]);
        onClose();
      }
    }
  };
  
  const handleSearch = async () => {
    if (!word.trim()) {
      setSearchError('Please enter a word to search');
      return;
    }
    
    // Rate limiting check
    if (!searchRateLimiter.isAllowed('dictionary-search')) {
      setSearchError('Too many search requests. Please wait a moment before trying again.');
      return;
    }
    
    // Validate word before searching
    const wordValidation = validateVocabularyWord(word.trim());
    if (!wordValidation.isValid) {
      setSearchError('Invalid word format for search');
      return;
    }
    
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      setIsSearching(true);
      setSearchError('');
      
      // URL-encode the term for multi-word phrases
      const term = encodeURIComponent(wordValidation.sanitizedValue!);
      
      // Validate URL before making request
      const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${term}`;
      if (!isValidUrl(apiUrl)) {
        throw new Error('Invalid API URL');
      }
      
      // Primary dictionary API call with timeout
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch definition');
      }
      
      const data = await response.json();
      let definitionFound = false;
      let exampleFound = false;
      
      if (data && data[0] && data[0].meanings && data[0].meanings[0]) {
        // Get first definition
        const firstDefinition = data[0].meanings[0].definitions[0];
        
        if (firstDefinition && firstDefinition.definition) {
          // Validate and sanitize the definition
          const definitionValidation = validateMeaning(firstDefinition.definition);
          if (definitionValidation.isValid) {
            setMeaning(definitionValidation.sanitizedValue!);
            definitionFound = true;
          }
          
          // Check for example
          if (firstDefinition.example) {
            const exampleValidation = validateExample(firstDefinition.example);
            if (exampleValidation.isValid) {
              setExample(exampleValidation.sanitizedValue!);
              exampleFound = true;
            }
          }
        }
      }
      
      if (!definitionFound) {
        setMeaning('No definition found.');
        setSearchError('No definition found. Please try another word or enter manually.');
      }
      
      if (!exampleFound) {
        setExample('No example found. Please enter manually.');
      }
      
    } catch (error) {
      console.error('Dictionary API error:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        setSearchError('Search request timed out. Please try again.');
      } else {
        setSearchError('Search failed. Please try again or enter details manually.');
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setIsSearching(false);
    }
  };

  const handleWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Basic real-time sanitization
    const sanitized = value.replace(/[<>]/g, '');
    setWord(sanitized);
  };

  const handleMeaningChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    // Basic real-time sanitization
    const sanitized = value.replace(/[<>]/g, '');
    setMeaning(sanitized);
  };

  const handleExampleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    // Basic real-time sanitization
    const sanitized = value.replace(/[<>]/g, '');
    setExample(sanitized);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editMode ? "Edit Word" : "Add New Vocabulary Word"}</DialogTitle>
        </DialogHeader>
        
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{htmlEncode(error)}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="word" className="text-right">
              Word
            </Label>
            <div className="col-span-3 flex gap-2">
              <Input
                id="word"
                value={word}
                onChange={handleWordChange}
                className="flex-grow"
                disabled={isSearching}
                aria-disabled={isSearching}
                maxLength={100}
              />
              {!editMode && (
                <Button 
                  type="button" 
                  onClick={handleSearch}
                  disabled={isSearching || !word.trim()}
                  aria-busy={isSearching}
                  className="shrink-0"
                >
                  {isSearching ? <Loader className="h-4 w-4 animate-spin mr-1" /> : 'Search'}
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
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="meaning" className="text-right">
              Meaning
            </Label>
            <Textarea
              id="meaning"
              value={meaning}
              onChange={handleMeaningChange}
              className="col-span-3"
              disabled={isSearching}
              rows={2}
              maxLength={500}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="example" className="text-right">
              Example
            </Label>
            <Textarea
              id="example"
              value={example}
              onChange={handleExampleChange}
              className="col-span-3"
              disabled={isSearching}
              rows={4}
              maxLength={1000}
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
            {editMode ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddWordModal;
