import { useMemo } from 'react';
import {
  DEFAULT_SET_ID,
  buildStudyList,
  getActiveSetId,
  listStoredSets,
  wordsForSet,
} from '@/lib/wordSets';

export function useImportedStudyWords(revision: number) {
  return useMemo(() => {
    const activeId = getActiveSetId();
    const set = listStoredSets().find((item) => item.id === activeId);
    if (!set || set.id === DEFAULT_SET_ID || !set.data) {
      return {
        revision,
        activeId,
        usingImported: false,
        words: [] as ReturnType<typeof wordsForSet>,
        study: [] as ReturnType<typeof wordsForSet>,
        name: set?.name ?? 'Default',
      };
    }
    const words = wordsForSet(set);
    return {
      revision,
      activeId,
      usingImported: true,
      words,
      study: buildStudyList(set.id, words),
      name: set.name,
    };
  }, [revision]);
}
