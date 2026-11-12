import { vocabularyService } from '@/services/vocabularyService';
import { DEFAULT_SET_ID } from './constants';
import { getSetData, setActiveSetId } from './repository';

/** Point the player at a set. Default reloads the built-in deck. */
export async function activateWordSet(id: string): Promise<void> {
  if (id === DEFAULT_SET_ID) {
    setActiveSetId(id);
    vocabularyService.restoreBuiltinSheets();
    await vocabularyService.loadDefaultVocabulary();
    return;
  }

  const data = getSetData(id);
  if (!data) {
    throw new Error('This set has no words stored on this device.');
  }
  const loaded = vocabularyService.loadSheetData(data);
  if (!loaded) {
    throw new Error('This set has no words to study.');
  }
  setActiveSetId(id);
}
