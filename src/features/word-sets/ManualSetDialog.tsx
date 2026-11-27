import React, { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useVocabularySets } from './VocabularySetContext';
import { getSetSheets, flattenSheets } from './vocabularySetStore';
import {
  MANUAL_CATEGORIES,
  MANUAL_DEFAULT_CATEGORY,
  canonicalManualCategory,
  MANUAL_LIMITS,
  MANUAL_SET_MAX_WORDS,
  manualKey,
  type ManualFieldErrors,
  type ManualWordInput,
} from './manualSet';

const EMPTY: Required<ManualWordInput> = { word: '', meaning: '', category: MANUAL_DEFAULT_CATEGORY, translation: '', example: '' };

const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? (
    <p id={id} role="alert" data-testid={id} className="mt-1 text-xs text-red-700 dark:text-red-300">
      {message}
    </p>
  ) : null;

const Field: React.FC<{
  name: keyof ManualWordInput;
  label: string;
  value: string;
  error?: string;
  required?: boolean;
  max: number;
  multiline?: boolean;
  placeholder?: string;
  onChange: (v: string) => void;
}> = ({ name, label, value, error, required, max, multiline, placeholder, onChange }) => {
  const id = `manual-${name}`;
  const common = {
    id,
    value,
    'aria-label': label,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
    dir: 'auto' as const,
    placeholder,
    maxLength: max * 2, // UTF-16 units; the exact code-point limit is validated on save
  };
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? ' *' : ''}
      </label>
      {multiline ? (
        <textarea
          {...common}
          rows={2}
          className="mt-1 w-full rounded-md border bg-transparent p-2 text-sm"
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input {...common} className="mt-1 min-h-11 text-base" onChange={(e) => onChange(e.target.value)} />
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
};

/** The word form: required word + meaning, optional category/translation/example, inline errors. */
export const ManualWordForm: React.FC<{
  value: Required<ManualWordInput>;
  errors: ManualFieldErrors;
  onChange: (v: Required<ManualWordInput>) => void;
  lockWord?: boolean;
}> = ({ value, errors, onChange, lockWord }) => {
  const set = (k: keyof ManualWordInput) => (v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-2">
      {lockWord ? (
        <p className="text-sm font-semibold" dir="auto">{value.word}</p>
      ) : (
        <Field name="word" label="Word" value={value.word} error={errors.word} required max={MANUAL_LIMITS.word} onChange={set('word')} />
      )}
      <Field name="meaning" label="Meaning" value={value.meaning} error={errors.meaning} required max={MANUAL_LIMITS.meaning} multiline onChange={set('meaning')} />
      <div>
        <label htmlFor="manual-category" className="text-sm font-medium">Category</label>
        <select
          id="manual-category"
          aria-label="Category"
          data-testid="manual-category"
          value={canonicalManualCategory(value.category) ?? MANUAL_DEFAULT_CATEGORY}
          aria-invalid={errors.category ? true : undefined}
          aria-describedby={errors.category ? 'manual-category-error' : undefined}
          className="mt-1 min-h-11 w-full rounded-md border bg-transparent px-2 text-base"
          onChange={(e) => set('category')(e.target.value)}
        >
          {MANUAL_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <FieldError id="manual-category-error" message={errors.category} />
      </div>
      <Field name="translation" label="Translation (optional)" value={value.translation} error={errors.translation} max={MANUAL_LIMITS.translation} multiline onChange={set('translation')} />
      <Field name="example" label="Example (optional)" value={value.example} error={errors.example} max={MANUAL_LIMITS.example} multiline onChange={set('example')} />
    </div>
  );
};

/** "New set": name + the FIRST word are required (an empty set cannot be selected or learned). */
export const CreateManualSetDialog: React.FC<{ open: boolean; onClose: (createdId?: string) => void }> = ({ open, onClose }) => {
  const { createManualSet } = useVocabularySets();
  const [name, setName] = useState('');
  const [word, setWord] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<ManualFieldErrors>({});

  const reset = () => { setName(''); setWord({ ...EMPTY }); setErrors({}); };
  const submit = () => {
    const r = createManualSet(name, word);
    if (r.ok === false) { setErrors(r.errors); return; }
    reset();
    onClose(r.set?.id);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent data-testid="create-set-dialog">
        <DialogHeader>
          <DialogTitle>New word set</DialogTitle>
          <DialogDescription>Name your set and add its first word. You can add more words one by one afterwards.</DialogDescription>
        </DialogHeader>
        <div>
          <label htmlFor="manual-set-name" className="text-sm font-medium">Set name *</label>
          <Input id="manual-set-name" aria-label="Set name" value={name} maxLength={60} dir="auto" className="mt-1 min-h-11 text-base"
            aria-invalid={errors.form ? true : undefined} onChange={(e) => setName(e.target.value)} />
          <FieldError id="manual-set-name-error" message={errors.form} />
        </div>
        <ManualWordForm value={word} errors={errors} onChange={setWord} />
        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button type="button" className="min-h-11" onClick={submit} data-testid="create-set-submit">Create set</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** Add words one by one, and edit / remove existing words of a hand-made set. */
export const ManageManualSetDialog: React.FC<{ setId: string | null; onClose: () => void; onImportCta?: () => void }> = ({ setId, onClose, onImportCta }) => {
  const { sets, addManualWord, updateManualWord, removeManualWord } = useVocabularySets();
  const [word, setWord] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<ManualFieldErrors>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const set = sets.find((s) => s.id === setId);
  const words = setId && set ? flattenSheets(getSetSheets(setId)) : [];

  const reset = () => { setWord({ ...EMPTY }); setErrors({}); setEditing(null); };
  const submit = () => {
    if (!setId) return;
    const r = editing ? updateManualWord(setId, editing, word) : addManualWord(setId, word);
    if (r.ok === false) { setErrors(r.errors); setJustAdded(null); return; }
    setJustAdded(word.word.trim());
    reset();
  };
  const startEdit = (w: (typeof words)[number]) => {
    setEditing(manualKey(w.word, w.category));
    setErrors({});
    setJustAdded(null);
    setWord({ word: w.word, meaning: w.meaning, category: canonicalManualCategory(w.category) ?? MANUAL_DEFAULT_CATEGORY, translation: w.translation ?? '', example: w.example });
  };
  const remove = (w: (typeof words)[number]) => {
    if (!setId) return;
    const r = removeManualWord(setId, manualKey(w.word, w.category));
    setErrors(r.ok === false ? r.errors : {});
    if (editing === manualKey(w.word, w.category)) reset();
  };
  const atCap = words.length >= MANUAL_SET_MAX_WORDS;

  return (
    <Dialog open={Boolean(setId && set)} onOpenChange={(o) => { if (!o) { reset(); setJustAdded(null); onClose(); } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="manage-set-dialog">
        <DialogHeader>
          <DialogTitle>{set?.name ?? 'Word set'}</DialogTitle>
          <DialogDescription>
            {words.length} / {MANUAL_SET_MAX_WORDS} words. {editing ? 'Editing a word (the word itself cannot change; remove and re-add it for that).' : 'Add a word, then the next one.'}
          </DialogDescription>
        </DialogHeader>
        {errors.form && <FieldError id="manual-form-error" message={errors.form} />}
        {atCap && !editing ? (
          <p role="status" className="text-sm">This set is full ({MANUAL_SET_MAX_WORDS} words). Import a file (Pro) for bigger sets.</p>
        ) : (
          <ManualWordForm value={word} errors={{ ...errors, form: undefined }} onChange={setWord} lockWord={Boolean(editing)} />
        )}
        {justAdded && <p role="status" data-testid="manual-added" className="text-sm text-[var(--lv-accent)]">Added “{justAdded}”.</p>}
        <div className="flex flex-wrap gap-2">
          {(!atCap || editing) && (
            <Button type="button" className="min-h-11" onClick={submit} data-testid="manual-word-submit">{editing ? 'Save changes' : 'Add word'}</Button>
          )}
          {editing && <Button type="button" variant="outline" className="min-h-11" onClick={reset}>Cancel edit</Button>}
        </div>
        {words.length > 0 && (
          <ul className="max-h-48 space-y-1 overflow-y-auto border-t pt-2" data-testid="manual-word-list">
            {words.map((w) => (
              <li key={manualKey(w.word, w.category)} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate" dir="auto">{w.word} — {w.meaning}</span>
                <button type="button" aria-label={`Edit ${w.word}`} className="p-2" onClick={() => startEdit(w)}><Pencil className="h-4 w-4" /></button>
                <button type="button" aria-label={`Remove ${w.word}`} className="p-2 text-red-700 dark:text-red-300" onClick={() => remove(w)}><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
        {onImportCta && (
          <p className="text-xs text-muted-foreground">
            Have a long list? <button type="button" className="underline" onClick={onImportCta}>Import a file (Pro)</button>
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => { reset(); onClose(); }}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
