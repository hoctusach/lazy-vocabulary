
/**
 * Utility functions for exporting vocabulary data
 */

import { SheetData } from "@/types/vocabulary";

/**
 * Exports vocabulary data as a TypeScript file and triggers download
 * @param data The vocabulary data to export
 */
export const exportVocabularyAsTypeScript = (data: SheetData) => {
  // Create the TypeScript content
  const tsContent = generateTypeScriptContent(data);
  
  // Create a blob with the content
  const blob = new Blob([tsContent], { type: 'text/typescript;charset=utf-8' });
  
  // Create a download URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary anchor element to trigger download
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = 'data.ts';
  
  // Append to body, click, and remove
  document.body.appendChild(downloadLink);
  downloadLink.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Generates properly formatted TypeScript content from vocabulary data
 * @param data The vocabulary data to format
 * @returns Formatted TypeScript string
 */
const generateTypeScriptContent = (data: SheetData): string => {
  // Start with the export declaration
  let content = 'export const vocabularyData = {\n';
  
  // Add each category
  Object.keys(data).forEach((category, categoryIndex) => {
    // Add category with proper quotes
    content += `  "${category}": [\n`;
    
    // Add each word in this category
    const words = data[category];
    words.forEach((word, wordIndex) => {
      content += '    {\n';
      content += `      "word": ${JSON.stringify(word.word)},\n`;
      content += `      "meaning": ${JSON.stringify(word.meaning)},\n`;
      content += `      "example": ${JSON.stringify(word.example)},\n`;
      content += `      "count": ${typeof word.count === 'number' ? word.count : 0}\n`;
      content += '    }' + (wordIndex < words.length - 1 ? ',\n' : '\n');
    });
    
    // Close this category array
    content += '  ]' + (categoryIndex < Object.keys(data).length - 1 ? ',\n' : '\n');
  });
  
  // Close the main object
  content += '};\n';
  
  return content;
};
