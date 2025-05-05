
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
      onClose();
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
            <Input
              id="word"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="meaning" className="text-right">
              Meaning
            </Label>
            <Input
              id="meaning"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              className="col-span-3"
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
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <div className="col-span-3">
              <Select value={category} onValueChange={setCategory}>
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
          <Button type="submit" disabled={!isFormValid} onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddWordModal;
