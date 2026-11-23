import React, { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useVocabularySets } from '@/features/word-sets/VocabularySetContext';
import { WORD_LIMITS } from '@/features/word-sets/wordValidation';
import { canUseProFeature } from '@/features/pro/proFeatures';
import {
  getTranslationOverride,
  resolveTranslation,
  setTranslationOverride,
  subscribeTranslationOverrides,
} from '@/features/translation/translationOverrides';

interface TranslationLineProps {
  word: string;
  category?: string;
  defaultTranslation?: string;
}

/**
 * Always rendered. Shows the learner's own translation first, then the built-in one
 * (Vietnamese devices only), and an edit icon so they can add or change it.
 */
const TranslationLine: React.FC<TranslationLineProps> = ({ word, category, defaultTranslation }) => {
  const { activeSet } = useVocabularySets();
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const canEdit = canUseProFeature('editTranslation');

  useEffect(() => subscribeTranslationOverrides(() => setTick((value) => value + 1)), []);

  const override = React.useMemo(() => {
    void tick;
    return getTranslationOverride(activeSet.id, word, category);
  }, [activeSet.id, word, category, tick]);

  const shown = resolveTranslation({
    override,
    defaultValue: defaultTranslation,
    builtinSet: activeSet.builtin,
  });

  const save = () => {
    const result = setTranslationOverride(activeSet.id, word, category, draft);
    if (result.ok === false) {
      toast.error(result.error);
      return;
    }
    toast.success(draft.trim() ? 'Translation saved.' : 'Translation cleared.');
    setOpen(false);
  };

  return (
    <div
      className="flex items-start gap-1"
      style={{ fontStyle: 'italic', fontSize: '0.9em', textAlign: 'left', whiteSpace: 'pre-line' }}
    >
      {shown ? <em>* {shown}</em> : canEdit ? <em className="theme-muted-text">* Add translation</em> : null}
      {canEdit && (
        <button
          type="button"
          aria-label={shown ? 'Edit translation' : 'Add translation'}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full theme-muted-text"
          onClick={() => {
            setDraft(override);
            setOpen(true);
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Translation for “{word}”</DialogTitle>
            <DialogDescription>
              Write it in any language. Leave it blank to go back to the default.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={WORD_LIMITS.translation}
            className="min-h-24 text-base"
            aria-label="Translation"
          />
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="min-h-11" onClick={save}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TranslationLine;
