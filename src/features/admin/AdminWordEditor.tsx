import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OFFICIAL_CATEGORIES, saveOfficialWord, type OfficialWordEdit } from './adminApi';
import { useAdmin } from './useAdmin';

type Props = { word: string; meaning: string; example: string; translation?: string; category: string };

/** [FB-55] Admin-only "Edit official word" control + dialog. Renders nothing for everyone else. */
const AdminWordEditor: React.FC<Props> = ({ word, meaning, example, translation, category }) => {
  const isAdmin = useAdmin();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const start: OfficialWordEdit = {
    word, meaning, example, translation: translation ?? '',
    category: OFFICIAL_CATEGORIES.includes(category) ? category : OFFICIAL_CATEGORIES[0],
  };
  const [form, setForm] = useState(start);
  if (!isAdmin) return null;
  const set = (k: keyof OfficialWordEdit) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    setBusy(true); setError(null);
    try {
      await saveOfficialWord({ word, category }, form);
      setSaved(true); setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button type="button" className="text-xs underline opacity-80" data-testid="admin-edit-word"
        onClick={() => { setForm(start); setError(null); setSaved(false); setOpen(true); }}>
        Edit official word
      </button>
      {saved && <span role="status" className="ml-2 text-xs">Saved. Everyone gets it after the next update.</span>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="admin-word-dialog">
          <DialogHeader>
            <DialogTitle>Edit official word</DialogTitle>
            <DialogDescription>This changes the word for every learner.</DialogDescription>
          </DialogHeader>
          <label className="text-sm font-medium" htmlFor="admin-word">Word</label>
          <Input id="admin-word" value={form.word} onChange={(e) => set('word')(e.target.value)} />
          <label className="text-sm font-medium" htmlFor="admin-meaning">Meaning</label>
          <textarea id="admin-meaning" rows={2} className="w-full rounded-md border bg-transparent p-2 text-sm" value={form.meaning} onChange={(e) => set('meaning')(e.target.value)} />
          <label className="text-sm font-medium" htmlFor="admin-example">Example</label>
          <textarea id="admin-example" rows={2} className="w-full rounded-md border bg-transparent p-2 text-sm" value={form.example} onChange={(e) => set('example')(e.target.value)} />
          <label className="text-sm font-medium" htmlFor="admin-translation">Translation</label>
          <textarea id="admin-translation" rows={2} className="w-full rounded-md border bg-transparent p-2 text-sm" value={form.translation} onChange={(e) => set('translation')(e.target.value)} />
          <label className="text-sm font-medium" htmlFor="admin-category">Category</label>
          <select id="admin-category" className="min-h-11 w-full rounded-md border bg-transparent px-2" value={form.category} onChange={(e) => set('category')(e.target.value)}>
            {OFFICIAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {error && <p role="alert" data-testid="admin-error" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" disabled={busy} onClick={() => void save()} data-testid="admin-save">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminWordEditor;
