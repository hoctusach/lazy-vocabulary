
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WordFormFieldsProps {
  meaning: string;
  onMeaningChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  example: string;
  onExampleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
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

const WordFormFields: React.FC<WordFormFieldsProps> = ({
  meaning,
  onMeaningChange,
  example,
  onExampleChange,
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
