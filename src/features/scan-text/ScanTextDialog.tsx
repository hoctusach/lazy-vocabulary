import React, { useMemo, useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ManualWordForm } from '@/features/word-sets/ManualSetDialog';
import { useVocabularySets } from '@/features/word-sets/VocabularySetContext';
import { MANUAL_DEFAULT_CATEGORY, type ManualFieldErrors, type ManualWordInput } from '@/features/word-sets/manualSet';
import { useProFeature } from '@/services/billing/proFeatures';
import { openProUpgrade } from '@/services/billing/proUpgradeStore';
import { FREE_SCANS_PER_DAY, scansLeftToday } from './dailyLimit';
import { getLanguageProfile } from './languages';
import { buildPrefill, performScan, translatePhrase } from './scanFlow';
import { dragSelect, selectionPhrase, sentenceFor, tapSelect, tokenize, type Selection } from './selection';
import type { ImageSource } from './ocr';

type Step = 'start' | 'reading' | 'select' | 'looking' | 'preview';
type Form = Required<ManualWordInput>;
type Notice = { tone: 'info' | 'warn'; text: string } | null;
const NEW_SET = '__new__';

/**
 * [FB-66] "Scan text": photo or gallery -> on-device OCR -> tap a word / drag a phrase -> meaning + translation -> editable
 * preview -> saved through the manual-word path. No language is named here; the language profile decides script and providers.
 */
const ScanTextDialog: React.FC<{ open: boolean; targetSetId?: string | null; onClose: () => void }> = ({ open, targetSetId, onClose }) => {
  const unlimited = useProFeature('unlimitedScans');
  const { sets, addManualWord, createManualSet } = useVocabularySets();
  const manualSets = sets.filter((s) => s.manual);
  const [step, setStep] = useState<Step>('start');
  const [text, setText] = useState('');
  const [sel, setSel] = useState<Selection | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [blocked, setBlocked] = useState(false);
  const [form, setForm] = useState<Form>({ word: '', meaning: '', category: MANUAL_DEFAULT_CATEGORY, translation: '', example: '' });
  const [errors, setErrors] = useState<ManualFieldErrors>({});
  const [setId, setSetId] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [download, setDownload] = useState<{ state: 'ask' | 'busy'; languages: string[] } | null>(null);
  const [transNote, setTransNote] = useState<string | null>(null);
  const answer = useRef<((ok: boolean) => void) | null>(null);
  const drag = useRef<{ from: number; moved: boolean } | null>(null);
  const run = useRef(0);

  const profile = getLanguageProfile();
  const tokens = useMemo(() => tokenize(text, profile.code), [text, profile.code]);
  const phrase = selectionPhrase(text, tokens, sel);
  const left = scansLeftToday(unlimited);
  const chosenSet = setId || targetSetId || manualSets[0]?.id || NEW_SET;

  const reset = () => {
    run.current++;
    setStep('start'); setText(''); setSel(null); setNotice(null); setBlocked(false); setErrors({}); setDownload(null); setTransNote(null);
    setNewName(''); setSetId('');
  };
  const close = () => { reset(); onClose(); };

  const scan = async (source: ImageSource) => {
    setNotice(null);
    setStep('reading');
    const r = await performScan({ source, unlimited });
    if (r.status === 'ok') { setText(r.text); setSel(null); setStep('select'); return; }
    setStep('start');
    if (r.status === 'blocked') { setBlocked(true); return; }
    if (r.status === 'cancelled') return;
    if (r.status === 'unavailable') setNotice({ tone: 'warn', text: 'Scanning text is not available here yet.' });
    else if (r.status === 'empty') setNotice({ tone: 'warn', text: 'No text found in that picture. Try a clearer photo.' });
    else setNotice({ tone: 'warn', text: r.message });
  };

  const onTokenDown = (i: number) => { drag.current = { from: i, moved: false }; };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.buttons === 0) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const idx = el?.dataset?.tok;
    if (idx === undefined) return;
    const over = Number(idx);
    if (over !== d.from || d.moved) { d.moved = true; setSel((s) => dragSelect(tokens, s, d.from, over)); }
  };
  const onUp = () => { setTimeout(() => { if (drag.current) drag.current.moved = false; }, 60); };
  const onTap = (i: number) => {
    if (drag.current?.moved) return;
    setSel((s) => tapSelect(tokens, s, i));
  };

  const lookUp = async () => {
    if (!phrase) return;
    const my = ++run.current;
    const alive = () => run.current === my;
    setStep('looking'); setErrors({}); setTransNote(null); setNotice(null);
    const example = sentenceFor(text, tokens, sel, profile.code);
    const pre = await buildPrefill({ phrase, example });
    if (!alive()) return;
    setForm(pre.form);
    if (pre.meaning.status === 'offline') setNotice({ tone: 'info', text: 'You are offline, so no meaning was found. Type it yourself.' });
    else if (pre.meaning.status === 'not-found') setNotice({ tone: 'info', text: 'No meaning found for this. Type it yourself.' });
    else if (pre.meaning.status === 'error') setNotice({ tone: 'info', text: 'The dictionary did not answer. Type the meaning yourself.' });
    setStep('preview');

    const t = await translatePhrase({
      phrase,
      confirmDownload: (languages) => new Promise<boolean>((resolve) => { answer.current = resolve; setDownload({ state: 'ask', languages }); }),
      onDownloading: () => setDownload((d) => (d ? { ...d, state: 'busy' } : d)),
    });
    if (!alive()) return;
    setDownload(null);
    if (t.status === 'ok' && t.text) setForm((f) => (f.translation ? f : { ...f, translation: t.text }));
    else if (t.status === 'declined') setTransNote('Translation skipped. You can type it yourself.');
    else if (t.status === 'failed' || t.status === 'unavailable') setTransNote('Could not translate on this device. You can type it yourself.');
  };

  const save = () => {
    const r = chosenSet === NEW_SET ? createManualSet(newName, form) : addManualWord(chosenSet, form);
    if (r.ok === false) { setErrors(r.errors); return; }
    toast.success(`Saved “${form.word.trim()}”.`);
    close();
  };

  const answerDownload = (ok: boolean) => {
    const a = answer.current; answer.current = null;
    if (!ok) setDownload(null);
    a?.(ok);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="scan-dialog">
        <DialogHeader>
          <DialogTitle>Scan text</DialogTitle>
          <DialogDescription>
            {step === 'start' && 'Take a photo or pick one from your gallery. The text is read on your device.'}
            {step === 'reading' && 'Reading the text…'}
            {step === 'select' && 'Tap a word, or drag (or tap a second word) to pick a phrase.'}
            {(step === 'looking' || step === 'preview') && 'Check the details, edit anything, then save.'}
          </DialogDescription>
        </DialogHeader>

        {notice && <p role="status" data-testid="scan-notice" className="text-sm">{notice.text}</p>}

        {step === 'start' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" className="min-h-11" data-testid="scan-camera" onClick={() => void scan('camera')}><Camera className="h-4 w-4" /> Take photo</Button>
              <Button type="button" variant="outline" className="min-h-11" data-testid="scan-gallery" onClick={() => void scan('gallery')}><ImageIcon className="h-4 w-4" /> From gallery</Button>
            </div>
            {!unlimited && <p data-testid="scan-left" className="text-xs text-muted-foreground">Free scans left today: {left} of {FREE_SCANS_PER_DAY}</p>}
            {blocked && (
              <div role="alert" data-testid="scan-blocked" className="space-y-2 rounded-md border p-3 text-sm">
                <p>You have used today’s {FREE_SCANS_PER_DAY} free scans. Come back tomorrow, or unlock unlimited scans with Pro.</p>
                <Button type="button" className="min-h-11" data-testid="scan-upgrade" onClick={() => openProUpgrade('unlimitedScans')}>See Pro</Button>
              </div>
            )}
          </div>
        )}

        {step === 'reading' && <p className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Reading the text…</p>}

        {step === 'select' && (
          <div className="space-y-3">
            <div
              data-testid="scan-text"
              className="max-h-64 overflow-y-auto rounded-md border p-3 text-base leading-8 whitespace-pre-wrap select-none"
              style={{ touchAction: 'pan-y' }}
              dir="auto"
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              {tokens.map((t, i) => {
                if (!t.word) return <span key={i}>{t.text}</span>;
                const lo = sel ? Math.min(sel.anchor, sel.focus) : -1;
                const hi = sel ? Math.max(sel.anchor, sel.focus) : -2;
                const on = i >= lo && i <= hi;
                return (
                  <span
                    key={i}
                    role="button"
                    tabIndex={0}
                    data-tok={i}
                    data-selected={on ? 'true' : 'false'}
                    className={`cursor-pointer rounded px-0.5 ${on ? 'bg-[var(--lv-accent)] text-white' : ''}`}
                    onPointerDown={() => onTokenDown(i)}
                    onClick={() => onTap(i)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel((s) => tapSelect(tokens, s, i)); } }}
                  >
                    {t.text}
                  </span>
                );
              })}
            </div>
            <p className="text-sm" data-testid="scan-selection" dir="auto">{phrase ? <>Selected: <strong>{phrase}</strong></> : 'Nothing selected yet.'}</p>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="min-h-11" onClick={reset}>Scan again</Button>
              <Button type="button" className="min-h-11" disabled={!phrase} data-testid="scan-lookup" onClick={() => void lookUp()}>Look up meaning</Button>
            </DialogFooter>
          </div>
        )}

        {step === 'looking' && <p className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Looking up the meaning…</p>}

        {step === 'preview' && (
          <div className="space-y-3">
            {download?.state === 'ask' && (
              <div role="alertdialog" data-testid="scan-download-prompt" className="space-y-2 rounded-md border p-3 text-sm">
                <p>To translate on your device, a small language pack ({download.languages.join(' + ')}) must be downloaded once. It may use mobile data.</p>
                <div className="flex gap-2">
                  <Button type="button" className="min-h-11" data-testid="scan-download-yes" onClick={() => answerDownload(true)}>Download</Button>
                  <Button type="button" variant="outline" className="min-h-11" data-testid="scan-download-no" onClick={() => answerDownload(false)}>Not now</Button>
                </div>
              </div>
            )}
            {download?.state === 'busy' && (
              <div role="progressbar" aria-label="Downloading language pack" aria-busy="true" data-testid="scan-download-progress" className="space-y-1 text-sm">
                <p>Downloading the language pack…</p>
                <div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full w-1/3 animate-pulse rounded bg-[var(--lv-accent)]" /></div>
              </div>
            )}
            {transNote && <p role="status" data-testid="scan-translation-note" className="text-xs text-muted-foreground">{transNote}</p>}
            <ManualWordForm value={form} errors={{ ...errors, form: undefined }} onChange={setForm} />
            <div>
              <label htmlFor="scan-target-set" className="text-sm font-medium">Save to</label>
              <select id="scan-target-set" data-testid="scan-target-set" aria-label="Save to" value={chosenSet} onChange={(e) => setSetId(e.target.value)} className="mt-1 min-h-11 w-full rounded-md border bg-transparent px-2 text-base">
                {manualSets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                <option value={NEW_SET}>New set…</option>
              </select>
              {chosenSet === NEW_SET && (
                <Input aria-label="New set name" data-testid="scan-new-set-name" className="mt-2 min-h-11 text-base" placeholder="Name of the new set" value={newName} maxLength={60} onChange={(e) => setNewName(e.target.value)} />
              )}
              {errors.form && <p role="alert" data-testid="scan-save-error" className="mt-1 text-xs text-red-700 dark:text-red-300">{errors.form}</p>}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="min-h-11" onClick={() => { run.current++; setDownload(null); setStep('select'); setErrors({}); setNotice(null); }}>Back</Button>
              <Button type="button" className="min-h-11" data-testid="scan-save" onClick={save}>Save word</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScanTextDialog;
