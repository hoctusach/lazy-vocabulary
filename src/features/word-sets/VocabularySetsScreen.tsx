import React, { useRef, useState } from 'react';
import { Check, Download, FileSpreadsheet, Pencil, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useVocabularySets } from './VocabularySetContext';
import { parseVocabularyImport } from './parseVocabularyImport';
import { buildSampleCsv, buildSampleJson, buildSampleXlsx } from './sampleTemplate';
import { DEFAULT_SET_ID } from './types';
import { saveBlob, saveTextFile } from '@/lib/platform/saveFile';
import { getSetProgress, progressStatsFor, flattenSheets, getSetSheets } from './vocabularySetStore';

const ACCEPT = '.csv,.xlsx,.xls,.json,text/csv,application/json,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const VocabularySetsScreen: React.FC = () => {
  const { sets, activeSet, activate, importSet, rename, remove } = useVocabularySets();
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setCounts = (id: string) => {
    if (id === DEFAULT_SET_ID) return null;
    return progressStatsFor(flattenSheets(getSetSheets(id)), getSetProgress(id));
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setErrors([]);
    setWarnings([]);
    try {
      const buffer = await file.arrayBuffer();
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      const parsed =
        extension === 'xlsx' || extension === 'xls'
          ? parseVocabularyImport({ fileName: file.name, data: buffer })
          : parseVocabularyImport({
              fileName: file.name,
              text: new TextDecoder('utf-8').decode(buffer),
            });
      if (!parsed.ok) {
        setErrors(parsed.errors);
        toast.error(parsed.errors[0] ?? 'Could not import that file.');
        return;
      }
      const error = importSet(parsed.nameSuggestion, parsed.sheets, file.name);
      if (error) {
        setErrors([error]);
        toast.error(error);
        return;
      }
      setWarnings(parsed.warnings);
      setPendingName(parsed.nameSuggestion);
      toast.success(`Imported ${parsed.wordCount} words into “${parsed.nameSuggestion}”.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read that file.';
      setErrors([message]);
      toast.error(message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const downloadCsv = async () => {
    await saveTextFile('vocabulary-set-template.csv', buildSampleCsv(), 'text/csv');
  };
  const downloadJson = async () => {
    await saveTextFile('vocabulary-set-template.json', buildSampleJson(), 'application/json');
  };
  const downloadXlsx = async () => {
    const bytes = buildSampleXlsx();
    await saveBlob(
      'vocabulary-set-template.xlsx',
      new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    );
  };

  return (
    <section className="space-y-4" data-screen="word-sets">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--lv-heading)' }}>
          Word sets
        </h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--lv-text-secondary)' }}>
          Default is the built-in list and its progress syncs with your account. Imported sets stay on this
          device, and each one keeps its own learned words.
        </p>
      </div>

      <div className="rounded-2xl border p-4 theme-card-surface" style={{ borderColor: 'var(--lv-border-color)' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">Import a set</h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--lv-text-secondary)' }}>
              CSV, Excel (.xlsx), or JSON. Required columns: word and meaning.
            </p>
          </div>
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {busy ? 'Reading file…' : 'Choose file'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            aria-label="Import vocabulary file"
            onChange={(event) => {
              void onPickFile(event.target.files?.[0]);
            }}
          />
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={() => void downloadCsv()}>
            <Download className="h-4 w-4" />
            CSV template
          </Button>
          <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={() => void downloadXlsx()}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel template
          </Button>
          <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={() => void downloadJson()}>
            <Download className="h-4 w-4" />
            JSON template
          </Button>
        </div>
        {errors.length > 0 && (
          <div
            role="alert"
            className="mt-3 space-y-1 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100"
          >
            {errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}
        {warnings.length > 0 && errors.length === 0 && (
          <div className="mt-3 space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        )}
        {pendingName && errors.length === 0 && (
          <p className="mt-3 text-sm" style={{ color: 'var(--lv-meaning)' }}>
            “{pendingName}” is now the active set.
          </p>
        )}
      </div>

      <ul className="space-y-3">
        {sets.map((set) => {
          const active = set.id === activeSet.id;
          const counts = setCounts(set.id);
          return (
            <li
              key={set.id}
              className="rounded-2xl border p-4 theme-card-surface"
              style={{
                borderColor: active ? 'var(--lv-accent)' : 'var(--lv-border-color)',
                boxShadow: active ? '0 0 0 1px var(--lv-accent)' : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-semibold">{set.name}</h3>
                    {active && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--lv-accent-soft)] px-2 py-1 text-xs font-medium">
                        <Check className="h-3.5 w-3.5" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm" style={{ color: 'var(--lv-text-secondary)' }}>
                    {set.wordCount.toLocaleString()} words
                    {set.builtin
                      ? ' · built-in · progress syncs to your account'
                      : ` · ${counts?.learning ?? 0} learning · ${counts?.learned ?? 0} learned on this device`}
                    {set.fileName && !set.builtin ? ` · ${set.fileName}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
                <Button
                  type="button"
                  className="min-h-11"
                  variant={active ? 'secondary' : 'default'}
                  disabled={active}
                  onClick={() => {
                    const error = activate(set.id);
                    if (error) toast.error(error);
                    else toast.success(`Now learning ${set.name}.`);
                  }}
                >
                  {active ? 'In use' : 'Use this set'}
                </Button>
                {!set.builtin && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => {
                        setRenameTarget({ id: set.id, name: set.name });
                        setRenameValue(set.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Rename
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="col-span-2 min-h-11 text-red-700 sm:col-span-1 dark:text-red-300"
                      onClick={() => setDeleteId(set.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename set</DialogTitle>
            <DialogDescription>This only changes the name stored on this device.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            maxLength={60}
            className="min-h-11 text-base"
            aria-label="Set name"
          />
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-11"
              onClick={() => {
                if (!renameTarget) return;
                const error = rename(renameTarget.id, renameValue);
                if (error) {
                  toast.error(error);
                  return;
                }
                toast.success('Set renamed.');
                setRenameTarget(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this set?</DialogTitle>
            <DialogDescription>
              The words and the learning progress for this set will be removed from this device. The Default set
              is not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setDeleteId(null)}>
              Keep set
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              onClick={() => {
                if (!deleteId) return;
                const error = remove(deleteId);
                if (error) toast.error(error);
                else toast.success('Set deleted.');
                setDeleteId(null);
              }}
            >
              Delete set
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default VocabularySetsScreen;
