import React, { useEffect, useRef, useState } from 'react';
import { Check, Pencil, Trash2, Upload } from 'lucide-react';
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
import { useProFeature } from '@/services/billing/proFeatures';
import { openProUpgrade } from '@/services/billing/proUpgradeStore';
import ProBadge from '@/components/pro/ProBadge';
import { parseVocabularyImport } from './parseVocabularyImport';
import { buildSampleCsv, buildSampleXlsx, CATEGORY_HELP_LINES } from './sampleTemplate';
import { DEFAULT_SET_ID } from './types';
import { CreateManualSetDialog, ManageManualSetDialog } from './ManualSetDialog';
import { saveBlob, saveTextFile } from '@/lib/platform/saveFile';
import {
  BUILTIN_GROUPS,
  builtinSelectedWordCount,
  builtinGroupCounts,
  builtinSourceId,
  getSetProgress,
  progressStatsFor,
  flattenSheets,
  getSetSheets,
} from './vocabularySetStore';

const ACCEPT = '.csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Native checkbox with a real tri-state (indeterminate) for the "select all built-in" parent. */
const Checkbox: React.FC<{
  checked: boolean;
  indeterminate?: boolean;
  label: string;
  onChange: () => void;
}> = ({ checked, indeterminate = false, label, onChange }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--lv-accent)]"
      checked={checked}
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      onChange={onChange}
    />
  );
};

const VocabularySetsScreen: React.FC = () => {
  const { sets, selectedSources, selectedBuiltinGroups, toggleSource, setBuiltinAll, importSet, rename, remove } =
    useVocabularySets();
  const [selectionNote, setSelectionNote] = useState<string | null>(null);
  const groupCounts = builtinGroupCounts();
  const builtinSelectedCount = selectedBuiltinGroups.length;
  const selectedWordCount = sets.reduce((sum, set) => {
    if (set.builtin) {
      return sum + builtinSelectedWordCount(selectedBuiltinGroups);
    }
    return selectedSources.includes(set.id) ? sum + set.wordCount : sum;
  }, 0);

  const onToggle = (id: string) => {
    const error = toggleSource(id);
    setSelectionNote(error);
    if (error) toast.error(error);
  };
  const onToggleBuiltinAll = () => {
    const error = setBuiltinAll(builtinSelectedCount < BUILTIN_GROUPS.length);
    setSelectionNote(error);
    if (error) toast.error(error);
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageId, setManageId] = useState<string | null>(null);
  const canImport = useProFeature('importSets');

  const setCounts = (id: string) => {
    if (id === DEFAULT_SET_ID) return null;
    return progressStatsFor(flattenSheets(getSetSheets(id)), getSetProgress(id));
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    if (!canImport) {
      openProUpgrade('importSets');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
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
      setSelectionNote(null);
      toast.success(`Imported ${parsed.wordCount} words into “${parsed.nameSuggestion}”.`);
      toast.success(`“${parsed.nameSuggestion}” was added to your selection.`);
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
          Library
        </h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--lv-text-secondary)' }}>
          Tick what you want to learn. Learn only plays ticked sets.{' '}
          <details className="inline" data-testid="sets-how">
            <summary className="inline cursor-pointer underline" style={{ color: 'var(--lv-link, var(--lv-heading))' }}>
              How?
            </summary>
            <span className="mt-1 block">
              Mix the built-in groups and your imported sets. "Word Set: C1, C2" is the built-in collection (six groups)
              and its progress syncs with your account. Imported sets stay on this device, and each one keeps its own
              learned words.
            </span>
          </details>
        </p>
        <p
          role="status"
          data-testid="selection-summary"
          className="mt-2 text-sm font-medium"
          style={{ color: 'var(--lv-heading)' }}
        >
          Selected: {selectedSources.length} {selectedSources.length === 1 ? 'set' : 'sets'} ·{' '}
          {selectedWordCount.toLocaleString()} {selectedWordCount === 1 ? 'word' : 'words'}
        </p>
        {selectionNote && (
          <p role="status" data-testid="selection-note" className="mt-1 text-sm text-amber-800 dark:text-amber-200">
            {selectionNote}
          </p>
        )}
      </div>

      <div className="rounded-2xl border p-4 theme-card-surface" style={{ borderColor: 'var(--lv-border-color)' }} data-testid="manual-set-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">Create your own set</h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--lv-text-secondary)' }}>
              Free: type words one by one. Have a long list? Import a file below (Pro).
            </p>
          </div>
          <Button type="button" className="min-h-11 w-full sm:w-auto" data-testid="new-set-button" onClick={() => setCreateOpen(true)}>
            New set
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border p-4 theme-card-surface" style={{ borderColor: 'var(--lv-border-color)' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">Import a set</h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--lv-text-secondary)' }}>
              Add many words at once from a CSV or Excel file.
            </p>
          </div>
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            disabled={busy}
            data-locked={canImport ? 'false' : 'true'}
            aria-label={canImport ? undefined : 'Choose file (Pro feature)'}
            onClick={() => (canImport ? inputRef.current?.click() : openProUpgrade('importSets'))}
          >
            <Upload className="h-4 w-4" />
            {busy ? 'Reading file…' : 'Choose file'}
            {!canImport && <ProBadge />}
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
        <div className="mt-3 grid grid-cols-2 gap-2" data-testid="example-files-row">
          <Button type="button" variant="outline" className="min-h-11" onClick={() => void downloadCsv()}>
            Download CSV
          </Button>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => void downloadXlsx()}>
            Download Excel
          </Button>
        </div>
        <ul className="mt-3 space-y-0.5 text-xs text-muted-foreground" data-testid="template-category-help">
          {CATEGORY_HELP_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
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
            “{pendingName}” was added to your selection.
          </p>
        )}
      </div>

      <ul className="space-y-3">
        {sets.map((set) => {
          const counts = setCounts(set.id);
          const selected = set.builtin ? builtinSelectedCount > 0 : selectedSources.includes(set.id);
          return (
            <li
              key={set.id}
              className="rounded-2xl border p-4 theme-card-surface"
              style={{
                borderColor: selected ? 'var(--lv-accent)' : 'var(--lv-border-color)',
                boxShadow: selected ? '0 0 0 1px var(--lv-accent)' : undefined,
              }}
            >
              <div className="flex items-start gap-3">
                {set.builtin ? (
                  <Checkbox
                    checked={builtinSelectedCount === BUILTIN_GROUPS.length}
                    indeterminate={builtinSelectedCount > 0 && builtinSelectedCount < BUILTIN_GROUPS.length}
                    label={`Select all groups of ${set.name}`}
                    onChange={onToggleBuiltinAll}
                  />
                ) : (
                  <Checkbox checked={selected} label={`Include ${set.name}`} onChange={() => onToggle(set.id)} />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-semibold">{set.name}</h3>
                    {selected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--lv-accent-soft)] px-2 py-1 text-xs font-medium">
                        <Check className="h-3.5 w-3.5" />
                        {set.builtin ? `${builtinSelectedCount} of ${BUILTIN_GROUPS.length} groups selected` : 'Selected'}
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
              {set.builtin && (
                <ul className="mt-3 space-y-1 border-t pt-3" style={{ borderColor: 'var(--lv-border-color)' }}>
                  {BUILTIN_GROUPS.map((group) => {
                    const id = builtinSourceId(group);
                    return (
                      <li key={id}>
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                          <Checkbox
                            checked={selectedSources.includes(id)}
                            label={`Include ${group}`}
                            onChange={() => onToggle(id)}
                          />
                          <span className="flex-1 capitalize">{group}</span>
                          <span style={{ color: 'var(--lv-text-secondary)' }}>
                            {(groupCounts[group] ?? 0).toLocaleString()} words
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              {!set.builtin && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
                  {set.manual && (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setManageId(set.id)}>
                      Add / edit words
                    </Button>
                  )}
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
                    className="min-h-11 text-red-700 dark:text-red-300"
                    onClick={() => setDeleteId(set.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <CreateManualSetDialog
        open={createOpen}
        onClose={(createdId) => {
          setCreateOpen(false);
          if (createdId) {
            toast.success('Set created and added to your selection.');
            setManageId(createdId);
          }
        }}
      />
      <ManageManualSetDialog setId={manageId} onClose={() => setManageId(null)} onImportCta={() => { setManageId(null); if (canImport) inputRef.current?.click(); else openProUpgrade('importSets'); }} />

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
              The words and the learning progress for this set will be removed from this device. The "Word Set: C1, C2" set
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
