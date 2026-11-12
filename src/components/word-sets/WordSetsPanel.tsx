import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Download, FileSpreadsheet, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DEFAULT_SET_ID,
  WORD_SETS_CHANGED_EVENT,
  VocabularyImportError,
  activateWordSet,
  deleteWordSet,
  downloadSampleCsv,
  downloadSampleXlsx,
  getActiveSetId,
  listLearnedWords,
  listStoredSets,
  parseVocabularyFile,
  recordWordEvent,
  renameWordSet,
  saveImportedSet,
  summarizeSet,
  wordsForSet,
  type StoredWordSet,
} from '@/lib/wordSets';
import { assertSupportedImport } from '@/lib/wordSets/parseVocabularyFile';

interface WordSetsPanelProps {
  variant?: 'full' | 'compact';
}

const WordSetsPanel = ({ variant = 'full' }: WordSetsPanelProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [revision, setRevision] = useState(0);
  const [pendingName, setPendingName] = useState('');
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener(WORD_SETS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(WORD_SETS_CHANGED_EVENT, refresh);
  }, []);

  const sets = useMemo(() => (revision < 0 ? [] : listStoredSets()), [revision]);
  const activeId = useMemo(() => (revision < 0 ? '' : getActiveSetId()), [revision]);
  const active = sets.find((set) => set.id === activeId) ?? sets[0];

  const activate = async (set: StoredWordSet) => {
    setError('');
    setBusy(true);
    try {
      await activateWordSet(set.id);
      toast.success(set.id === DEFAULT_SET_ID ? 'Studying the Default set' : `Studying “${set.name}”`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not switch sets.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setWarnings([]);
    setBusy(true);
    try {
      assertSupportedImport(file.name, file.size);
      const parsed = parseVocabularyFile(file.name, await file.arrayBuffer());
      const fallbackName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      const created = saveImportedSet({
        name: pendingName.trim() || fallbackName || 'Imported set',
        source: parsed.source,
        fileName: file.name,
        data: parsed.data,
        wordCount: parsed.wordCount,
        activate: false,
      });
      await activateWordSet(created.id);
      setWarnings(parsed.warnings);
      setPendingName('');
      toast.success(`Imported ${parsed.wordCount} words into “${created.name}”`);
    } catch (cause) {
      const message = cause instanceof VocabularyImportError || cause instanceof Error
        ? cause.message
        : 'Could not import that file.';
      setError(message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onRename = (set: StoredWordSet) => {
    const draft = (renameDrafts[set.id] ?? '').trim();
    if (!draft || draft === set.name) return;
    try {
      renameWordSet(set.id, draft);
      setRenameDrafts((current) => ({ ...current, [set.id]: '' }));
      toast.success('Set renamed');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not rename that set.');
    }
  };

  const onDelete = async (set: StoredWordSet) => {
    if (confirmDeleteId !== set.id) {
      setConfirmDeleteId(set.id);
      return;
    }
    const wasActive = activeId === set.id;
    try {
      deleteWordSet(set.id);
      setConfirmDeleteId(null);
      if (wasActive) await activateWordSet(DEFAULT_SET_ID);
      toast.success(`Deleted “${set.name}”`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete that set.');
    }
  };

  if (variant === 'compact') {
    return (
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--lv-border-color)] bg-[var(--lv-card-bg)] px-3 py-2 shadow-sm">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-[var(--lv-text-secondary)]">Word set</p>
          <p className="truncate text-sm font-semibold text-[var(--lv-text-primary)]">{active?.name ?? 'Default'}</p>
        </div>
        <p className="text-xs text-[var(--lv-text-secondary)]">{active?.wordCount ?? 0} words</p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--lv-heading)]">Word sets</h2>
        <p className="mt-1 text-sm text-[var(--lv-text-secondary)]">
          Default is the built-in list. Import a CSV, Excel, or JSON file to study your own words. Progress is kept separately for each set on this device.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--lv-border-color)] bg-[var(--lv-card-bg)] p-4 shadow-sm">
        <label className="text-sm font-semibold text-[var(--lv-text-primary)]" htmlFor="set-name">
          Name for the next import
        </label>
        <Input
          id="set-name"
          value={pendingName}
          onChange={(event) => setPendingName(event.target.value)}
          placeholder="Travel phrases"
          maxLength={60}
          className="mt-2 h-11 text-base"
        />
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          accept=".csv,.tsv,.xlsx,.xls,.json,text/csv,application/json,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
          }}
        />
        <Button
          type="button"
          className="mt-3 h-12 w-full text-base"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <FileSpreadsheet className="h-5 w-5" />
          Import CSV, Excel, or JSON
        </Button>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" className="h-11" onClick={() => void downloadSampleCsv()}>
            <Download className="h-4 w-4" />
            CSV template
          </Button>
          <Button type="button" variant="outline" className="h-11" onClick={() => void downloadSampleXlsx()}>
            <Download className="h-4 w-4" />
            Excel template
          </Button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[var(--lv-text-secondary)]">
          Columns: word, meaning, example, category, translation. A sample file also lives at{' '}
          <a className="underline" href="/samples/vocabulary-template.csv">vocabulary-template.csv</a>.
        </p>
        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200" role="alert">
            {error}
          </p>
        )}
        {warnings.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-amber-800 dark:text-amber-200">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
      </div>

      <ul className="space-y-3">
        {sets.map((set) => {
          const words = wordsForSet(set);
          const stats = summarizeSet(set.id, words);
          const selected = set.id === activeId;
          const learned = listLearnedWords(set.id, words);
          return (
            <li
              key={set.id}
              className={`rounded-2xl border bg-[var(--lv-card-bg)] p-4 shadow-sm ${
                selected ? 'border-[var(--lv-accent)] ring-2 ring-[var(--lv-accent)]/30' : 'border-[var(--lv-border-color)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-semibold text-[var(--lv-text-primary)]">{set.name}</h3>
                    {selected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--lv-accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--lv-accent)]">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[var(--lv-text-secondary)]">
                    {set.wordCount} words · {stats.learned} learned · {stats.learning} learning
                    {stats.due > 0 ? ` · ${stats.due} due` : ''}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" className="h-11" disabled={busy || selected} onClick={() => void activate(set)}>
                  {selected ? 'Studying' : 'Study this set'}
                </Button>
                {set.id !== DEFAULT_SET_ID && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={() => void onDelete(set)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {confirmDeleteId === set.id ? 'Tap again to delete' : 'Delete'}
                  </Button>
                )}
              </div>

              {set.id !== DEFAULT_SET_ID && (
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onRename(set);
                  }}
                >
                  <Input
                    aria-label={`Rename ${set.name}`}
                    value={renameDrafts[set.id] ?? ''}
                    placeholder="Rename set"
                    maxLength={60}
                    className="h-11 text-base"
                    onChange={(event) =>
                      setRenameDrafts((current) => ({ ...current, [set.id]: event.target.value }))
                    }
                  />
                  <Button type="submit" variant="outline" className="h-11 shrink-0">
                    Rename
                  </Button>
                </form>
              )}

              {selected && learned.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-text-secondary)]">Learned in this set</p>
                  {learned.slice(0, 8).map((word) => (
                    <div key={`${word.category}-${word.word}`} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{word.word}</span>
                      <button
                        type="button"
                        className="min-h-11 shrink-0 px-2 text-xs font-medium text-[var(--lv-accent)]"
                        onClick={() => recordWordEvent(set.id, word.word, 'reset')}
                      >
                        Mark as new
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default WordSetsPanel;
