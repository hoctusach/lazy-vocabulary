
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateVocabularyWord, validateMeaning, validateExample, sanitizeUserInput } from '@/utils/security/inputValidation';
import { htmlEncode } from '@/utils/security/contentSecurity';
import { useWordFormState } from '@/hooks/vocabulary/useWordFormState';
import { useWordFormValidation } from '@/hooks/vocabulary/useWordFormValidation';
import { useWordSearch } from '@/hooks/vocabulary/useWordSearch';
import WordSearchSection from './WordSearchSection';
import WordFormFields from './WordFormFields';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newWord: { word: string; meaning: string; example: string; translation: string; category: string }) => void;
  editMode?: boolean;
  wordToEdit?: { word: string; meaning: string; example: string; translation?: string; category: string };
}

const AddWordModal: React.FC<AddWordModalProps> = ({ isOpen, onClose, onSave, editMode = false, wordToEdit }) => {
  // Form state management
  const {
    word,
    meaning,
    example,
    translation,
    category,
    setMeaning,
    setExample,
    setTranslation,
    setCategory,
    handleWordChange,
    handleMeaningChange,
    handleExampleChange,
    handleTranslationChange,
    resetForm
  } = useWordFormState({ editMode, wordToEdit, isOpen });

  // Form validation
  const { validationErrors, isFormValid } = useWordFormValidation({ word, meaning, example, category });

  // Search functionality
  const { isSearching, searchError, handleSearch, setSearchError } = useWordSearch({ 
    word, 
    setMeaning, 
    setExample 
  });

  const handleSave = () => {
    if (isFormValid) {
      // Final validation and sanitization before save
      const wordValidation = validateVocabularyWord(word);
      const meaningValidation = validateMeaning(meaning);
      const exampleValidation = validateExample(example);
      const sanitizedTranslation = sanitizeUserInput(translation);
      
      if (wordValidation.isValid && meaningValidation.isValid && exampleValidation.isValid) {
        onSave({
          word: wordValidation.sanitizedValue!,
          meaning: meaningValidation.sanitizedValue!,
          example: exampleValidation.sanitizedValue!,
          translation: sanitizedTranslation,
          category
        });
        
        // Reset form
        resetForm();
        setSearchError('');
        onClose();
      }
    }
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
          <WordSearchSection
            word={word}
            onWordChange={handleWordChange}
            onSearch={handleSearch}
            isSearching={isSearching}
            searchError={searchError}
            editMode={editMode}
          />
          
          <WordFormFields
            word={word}
            meaning={meaning}
            onMeaningChange={handleMeaningChange}
            example={example}
            onExampleChange={handleExampleChange}
            translation={translation}
            onTranslationChange={handleTranslationChange}
            setTranslation={setTranslation}
            category={category}
            onCategoryChange={setCategory}
            isDisabled={isSearching}
          />
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
