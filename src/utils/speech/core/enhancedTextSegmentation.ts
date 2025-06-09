
import { VocabularyWord } from '@/types/vocabulary';
import { getRegionSpeechSettings } from './enhancedSpeechSettings';
import { extractSpeechableContent } from '../../text/contentFilters';

/**
 * Enhanced text segmentation with region-specific break insertion
 */

export const createSegmentedSpeechText = (
  word: VocabularyWord, 
  region: 'US' | 'UK'
): string => {
  console.log('[ENHANCED-SEGMENTATION] Creating speech text for region:', region);
  
  const settings = getRegionSpeechSettings(region);
  
  // Extract and clean the content
  const cleanWord = extractSpeechableContent(word.word || '').trim();
  const cleanMeaning = extractSpeechableContent(word.meaning || '').trim();
  const cleanExample = extractSpeechableContent(word.example || '').trim();
  
  console.log('[ENHANCED-SEGMENTATION] Cleaned content:', {
    word: cleanWord.substring(0, 30),
    meaning: cleanMeaning.substring(0, 50),
    example: cleanExample.substring(0, 50)
  });
  
  // Build text with or without breaks based on region settings
  if (settings.addBreaks) {
    console.log('[ENHANCED-SEGMENTATION] Adding breaks for', region, 'voice');
    return buildTextWithBreaks(cleanWord, cleanMeaning, cleanExample, settings);
  } else {
    console.log('[ENHANCED-SEGMENTATION] No breaks for', region, 'voice');
    return buildTextWithoutBreaks(cleanWord, cleanMeaning, cleanExample);
  }
};

const buildTextWithBreaks = (
  word: string, 
  meaning: string, 
  example: string, 
  settings: { breakDuration: string; segmentPause: string }
): string => {
  const segments: string[] = [];
  
  // Add word
  if (word) {
    segments.push(word);
  }
  
  // Add meaning with break
  if (meaning) {
    segments.push(`<break time="${settings.breakDuration}"/>${meaning}`);
  }
  
  // Add example with break
  if (example) {
    segments.push(`<break time="${settings.breakDuration}"/>${example}`);
  }
  
  const result = segments.join('');
  console.log('[ENHANCED-SEGMENTATION] Built text with breaks:', result.substring(0, 100) + '...');
  return result;
};

const buildTextWithoutBreaks = (word: string, meaning: string, example: string): string => {
  const segments: string[] = [];
  
  if (word) segments.push(word);
  if (meaning) segments.push(meaning);
  if (example) segments.push(example);
  
  const result = segments.join('. ');
  console.log('[ENHANCED-SEGMENTATION] Built text without breaks:', result.substring(0, 100) + '...');
  return result;
};

export const prepareEnhancedSpeechText = (word: VocabularyWord, region: 'US' | 'UK'): string => {
  const segmentedText = createSegmentedSpeechText(word, region);
  
  // Final cleanup
  return segmentedText
    .replace(/\s+/g, ' ')
    .trim();
};
