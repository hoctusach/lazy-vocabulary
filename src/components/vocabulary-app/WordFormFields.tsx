
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { translate } from '@/utils/translate';
import { toast } from 'sonner';
import { useTranslationLang } from '@/hooks/useTranslationLang';

interface WordFormFieldsProps {
  word: string;
  meaning: string;
  onMeaningChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  example: string;
  onExampleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  translation: string;
  onTranslationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setTranslation: (value: string) => void;
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
  setTranslation,
  category,
  onCategoryChange,
  isDisabled
}) => {
  const { lang, setLang } = useTranslationLang();
  const [open, setOpen] = React.useState(false);

  const performTranslation = async (code: string) => {
    try {
      const result = await translate(word, code);
      setTranslation(result);
      const label = LANGUAGES.find(l => l.code === code)?.label || code;
      toast.success(`Translated to ${label}`);
    } catch (err) {
      console.error('Translation error', err);
      toast.error('Failed to translate');
    }
  };

  const handleGoClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!lang) {
      setOpen(true);
      return;
    }
    performTranslation(lang);
  };

  const handleForceSelect = (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(true);
  };

  const handleSelect = async (code: string) => {
    setLang(code);
    setOpen(false);
    await performTranslation(code);
  };
  const MEANING_INPUT_ID = "meaning-input";
  const EXAMPLE_INPUT_ID = "example-input";
  const TRANSLATION_INPUT_ID = "translation-input";
  const CATEGORY_INPUT_ID = "category-select";

  return (
    <>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor={MEANING_INPUT_ID} className="text-right">
          Meaning
        </Label>
        <Textarea
          id={MEANING_INPUT_ID}
          value={meaning}
          onChange={onMeaningChange}
          className="col-span-3"
          disabled={isDisabled}
          rows={2}
          maxLength={500}
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor={EXAMPLE_INPUT_ID} className="text-right">
          Example
        </Label>
        <Textarea
          id={EXAMPLE_INPUT_ID}
          value={example}
          onChange={onExampleChange}
          className="col-span-3"
          disabled={isDisabled}
          rows={4}
          maxLength={1000}
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor={TRANSLATION_INPUT_ID} className="text-right whitespace-nowrap">
          <span role="img" aria-label="translation">🌐</span> Translation
        </Label>
        <div className="col-span-3 flex gap-2">
          <Input
            id={TRANSLATION_INPUT_ID}
            value={translation}
            onChange={onTranslationChange}
            className="flex-grow"
            disabled={isDisabled}
            maxLength={200}
          />
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                className="shrink-0 px-2"
                onClick={handleGoClick}
                onContextMenu={handleForceSelect}
                disabled={isDisabled || !word.trim()}
              >
                Go
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {LANGUAGES.map((l) => (
                <DropdownMenuItem key={l.code} onSelect={() => handleSelect(l.code)}>
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor={CATEGORY_INPUT_ID} className="text-right">
          Category
        </Label>
        <div className="col-span-3">
          <Select value={category} onValueChange={onCategoryChange} disabled={isDisabled}>
            <SelectTrigger id={CATEGORY_INPUT_ID} className="w-28">
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
