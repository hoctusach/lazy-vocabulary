
// Type for vocabulary change listeners
type VocabularyChangeListener = () => void;

export class VocabularyEventManager {
  private vocabularyChangeListeners: VocabularyChangeListener[] = [];
  
  addVocabularyChangeListener(listener: VocabularyChangeListener): void {
    this.vocabularyChangeListeners.push(listener);
  }
  
  removeVocabularyChangeListener(listener: VocabularyChangeListener): void {
    this.vocabularyChangeListeners = this.vocabularyChangeListeners.filter(l => l !== listener);
  }
  
  notifyVocabularyChange(): void {
    this.vocabularyChangeListeners.forEach(listener => listener());
  }
}
