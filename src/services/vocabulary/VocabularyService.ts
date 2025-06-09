
import { VocabularyServiceNavigation } from "./VocabularyServiceNavigation";

/**
 * Main vocabulary service class that combines all functionality
 */
export class VocabularyService extends VocabularyServiceNavigation {
  
  constructor() {
    super();
    this.initializeService();
  }
}
