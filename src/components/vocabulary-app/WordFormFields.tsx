
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { translate } from '@/services/translationService';

interface WordFormFieldsProps {
  word: string;
  meaning: string;
  onMeaningChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  example: string;
  onExampleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  translation: string;
  onTranslationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  isDisabled: boolean;
}

// Updated category options without "All words"
const CATEGORY_OPTIONS = [
  { value: "phrasal verbs", label: "Phrasal Verb" },
  { value: "idioms", label: "Idiom" },
  { value: "topic vocab", label: "Topic vocabulary" },
  { value: "grammar", label: "Grammar" },
  { value: "phrases, collocations", label: "Phrase - Collocation" },
  { value: "word formation", label: "Word formation" }
];

const LANGUAGES = [
  { code: 'vi', label: 'Vietnamese' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ko', label: 'Korean' },
  { code: 'de', label: 'German' },
  { code: 'ru', label: 'Russian' }
];

const WordFormFields: React.FC<WordFormFieldsProps> = ({
  word,
  meaning,
  onMeaningChange,
  example,
  onExampleChange,
  translation,
  onTranslationChange,
  category,
  onCategoryChange,
  isDisabled
}) => {
  return (
    <>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="meaning" className="text-right">
          Meaning
        </Label>
        <Textarea
          id="meaning"
          value={meaning}
          onChange={onMeaningChange}
          className="col-span-3"
          disabled={isDisabled}
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
          onChange={onExampleChange}
          className="col-span-3"
          disabled={isDisabled}
          rows={4}
          maxLength={1000}
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <div className="flex justify-between items-center">
          <Label htmlFor="translation" className="text-right whitespace-nowrap">
            Translation
          </Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="px-1">
                🌐 Translate To
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onSelect={() => translate(word, lang.code)}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Input
          id="translation"
          value={translation}
          onChange={onTranslationChange}
          className="col-span-3"
          disabled={isDisabled}
          maxLength={200}
        />
      </div>
      
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="category" className="text-right">
          Category
        </Label>
        <div className="col-span-3">
          <Select value={category} onValueChange={onCategoryChange} disabled={isDisabled}>
            <SelectTrigger className="w-28">
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
    </>
  );
};

export default WordFormFields;
