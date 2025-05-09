
import { SheetData, VocabularyWord } from '@/types/vocabulary';

/**
 * Format vocabulary data into a TypeScript file content string
 */
export const formatVocabularyData = (data: SheetData): string => {
  // Convert the data to a formatted string with proper indentation
  return `export const vocabularyData = ${JSON.stringify(data, null, 2)
    .replace(/\n/g, '\n')
    .replace(/"/g, '"')};\n`;
};

/**
 * Export vocabulary data as a TypeScript file and trigger download
 */
export const exportVocabularyAsTypeScript = (data: SheetData): void => {
  // Format the data
  const fileContent = formatVocabularyData(data);
  
  // Create a blob with the data
  const blob = new Blob([fileContent], { type: 'text/typescript;charset=utf-8' });
  
  // Create a download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'data.ts';
  
  // Add to DOM, trigger download, and clean up
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
};
