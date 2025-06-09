
import { VocabularyServiceInitialization } from "./VocabularyServiceInitialization";

// Type for vocabulary change listeners
type VocabularyChangeListener = () => void;

/**
 * Handles vocabulary service event listeners
 */
export class VocabularyServiceListeners extends VocabularyServiceInitialization {
  private vocabularyChangeListeners: VocabularyChangeListener[] = [];
  
  addVocabularyChangeListener(listener: VocabularyChangeListener): void {
    this.vocabularyChangeListeners.push(listener);
  }
  
  removeVocabularyChangeListener(listener: VocabularyChangeListener): void {
    this.vocabularyChangeListeners = this.vocabularyChangeListeners.filter(l => l !== listener);
  }
  
  protected notifyVocabularyChange(): void {
    this.vocabularyChangeListeners.forEach(listener => listener());
  }
}
