
import { VocabularyService } from "./VocabularyService";

// Export the singleton instance
export const vocabularyService = new VocabularyService();

// Re-export the class for testing/mocking
export { VocabularyService };
