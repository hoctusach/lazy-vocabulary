/**
 * Text processing utilities for handling IPA notation and Vietnamese content
 * These utilities help identify content that should bypass validation or be excluded from speech
 */

/**
 * Detects if text contains IPA notation (content within /.../ brackets)
 */
export const containsIPANotation = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  // Match IPA notation patterns like /ˈhæpɪ/ or /pronunciation/
  const ipaPattern = /\/[^\/]+\//g;
  return ipaPattern.test(text);
};

/**
 * Detects if text contains Vietnamese characters
 */
export const containsVietnamese = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  // Vietnamese Unicode ranges including diacritics
  const vietnamesePattern = /[\u00C0-\u00C3\u00C8-\u00CA\u00CC-\u00CD\u00D2-\u00D5\u00D9-\u00DA\u00DD\u0102\u0103\u0110\u0111\u0128\u0129\u0168\u0169\u01A0\u01A1\u01AF\u01B0\u1EA0-\u1EF9]/;
  return vietnamesePattern.test(text);
};

/**
 * Checks if content should bypass validation (contains IPA or Vietnamese)
 */
export const shouldBypassValidation = (text: string): boolean => {
  return containsIPANotation(text) || containsVietnamese(text);
};

/**
 * Extracts speechable content by removing IPA notation and Vietnamese words
 */
export const extractSpeechableContent = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  console.log('[CONTENT-FILTER] Processing text for speech:', text.substring(0, 50) + '...');
  
  let processed = text;
  
  // Remove IPA notation (content within /.../ brackets)
  processed = processed.replace(/\/[^\/]+\//g, '').trim();
  
  // Remove Vietnamese words (words containing Vietnamese characters)
  // Split by whitespace, filter out Vietnamese words, rejoin
  const words = processed.split(/\s+/);
  const filteredWords = words.filter(word => !containsVietnamese(word));
  processed = filteredWords.join(' ').trim();
  
  // Clean up extra whitespace
  processed = processed.replace(/\s+/g, ' ').trim();
  
  console.log('[CONTENT-FILTER] Original text length:', text.length);
  console.log('[CONTENT-FILTER] Processed text length:', processed.length);
  console.log('[CONTENT-FILTER] Filtered content:', processed.substring(0, 50) + '...');
  
  return processed;
};

/**
 * Prepares text for display (keeps all content but marks filtered sections)
 */
export const prepareTextForDisplay = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  // For display, we keep everything as-is
  // This function exists for consistency and future display enhancements
  return text.trim();
};

/**
 * Validates that filtered content is not empty after processing
 */
export const hasValidSpeechableContent = (text: string): boolean => {
  const speechable = extractSpeechableContent(text);
  return speechable.length > 0;
};
