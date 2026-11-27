import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useVocabularySets } from '@/features/word-sets/VocabularySetContext';
import { getImportedSet, listAllImportedSets, type AdminImportedSetInfo } from './adminApi';
import { useAdmin } from './useAdmin';

/** [FB-55] Admin-only: every user's imported sets. "Study" copies one to THIS device (the owner's copy is never changed). */
const AdminImportedSets: React.FC = () => {
  const isAdmin = useAdmin();
  const { importSet } = useVocabularySets();
  const [sets, setSets] = useState<AdminImportedSetInfo[] | null>(null);
  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    void listAllImportedSets().then((r) => { if (alive) setSets(r); });
    return () => { alive = false; };
  }, [isAdmin]);
  if (!isAdmin) return null;
  const study = async (s: AdminImportedSetInfo) => {
    const full = await getImportedSet(s.id);
    if (!full) { toast.error('Could not open that set.'); return; }
    const error = importSet(`${s.name} (${s.ownerNickname})`, full.sheets);
    if (error) toast.error(error); else toast.success('Set added to your Library.');
  };
  return (
    <div className="lv-section p-4 pl-5" data-testid="admin-sets-card">
      <h3 className="lv-section-title">All users' sets (admin)</h3>
      {!sets || sets.length === 0 ? (
        <p className="mt-1 text-sm">No sets found.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {sets.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{s.ownerNickname} · {s.name} · {s.wordCount} words</span>
              <Button type="button" size="sm" variant="outline" onClick={() => void study(s)}>Study</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminImportedSets;
