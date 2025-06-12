/**
 * Enhanced content filtering for speech synthesis
 * Improved to preserve more speechable content while filtering out problematic elements
 */

// IPA (International Phonetic Alphabet) character ranges
const IPA_RANGES = [
  /[\u0250-\u02AF]/g,  // IPA Extensions
  /[\u1D00-\u1D7F]/g,  // Phonetic Extensions
  /[\u1D80-\u1DBF]/g,  // Phonetic Extensions Supplement
  /[ɑɒæɓʙβɕçɗɖðʤʣeɛɘəɚɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸœɶʘɹɺɾɻʀʁɽʂʃʈθʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʢˈˌˑ]/g  // Common IPA symbols
];

// Vietnamese diacritics and characters
const VIETNAMESE_RANGES = [
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi,
  /[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g
];

// Patterns that should trigger bypass validation
const BYPASS_PATTERNS = [
  ...IPA_RANGES,
  ...VIETNAMESE_RANGES,
  /\[.*?\]/g, // Content in square brackets (often IPA)
  /\/.*?\//g  // Content between forward slashes (often phonetic)
];

export const getPreserveSpecialFromStorage = (): boolean => {
  try {
    if (typeof localStorage === 'undefined') return false;
    const stored = localStorage.getItem('buttonStates');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.preserveSpecial === true;
    }
  } catch (error) {
    console.error('Error reading preserveSpecial flag from localStorage:', error);
  }
  return false;
};

/**
 * Check if text contains IPA notation or Vietnamese characters that should bypass validation
 */
export const shouldBypassValidation = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  
  return BYPASS_PATTERNS.some(pattern => pattern.test(text));
};

/**
 * Extract content that can be spoken by speech synthesis
 * More conservative filtering - only removes obvious problematic content
 */
export const extractSpeechableContent = (text: string, preserveSpecial = false): string => {
  if (!text || typeof text !== 'string') return '';
  
  console.log('[CONTENT-FILTER] Processing text for speech:', text.substring(0, 100) + '...');
  console.log('[CONTENT-FILTER] Original text length:', text.length);
  
  let processedText = text;
  
  // Remove content in square brackets (often IPA notation or word type)
  // Always strip this content from the spoken text
  processedText = processedText.replace(/\[[^\]]*\]/g, '');

  // Remove short parenthetical word type labels like "(adj)" or "(noun)"
  processedText = processedText.replace(/\([a-zA-Z.\s]{1,20}\)/g, '');
  
  // Remove content between forward slashes (phonetic transcription)
  processedText = processedText.replace(/\/([^/]*)\//g, '');
  
  if (!preserveSpecial) {
    // Remove standalone IPA characters but preserve words containing them
    // Only remove if the entire word consists mainly of IPA characters
    processedText = processedText.replace(/\b\w*[ɑɒæɓʙβɕçɗɖðʤʣeɛɘəɚɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸœɶʘɹɺɾɻʀʁɽʂʃʈθʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʢˈˌˑ]\w*\b/g, (match) => {
      // Only remove if more than 50% of the word is IPA characters
      const ipaCount = (match.match(/[ɑɒæɓʙβɕçɗɖðʤʣeɛɘəɚɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸœɶʘɹɺɾɻʀʁɽʂʃʈθʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʢˈˌˑ]/g) || []).length;
      if (ipaCount / match.length > 0.5) {
        return '';
      }
      return match;
    });
  }
  
  // Clean up extra whitespace
  processedText = processedText.replace(/\s+/g, ' ').trim();
  
  console.log('[CONTENT-FILTER] Processed text length:', processedText.length);
  console.log('[CONTENT-FILTER] Filtered content:', processedText.substring(0, 100) + '...');
  
  return processedText;
};

/**
 * Check if text has valid content for speech after filtering
 */
export const hasValidSpeechableContent = (
  text: string,
  preserveSpecial = false
): boolean => {
  const filtered = extractSpeechableContent(text, preserveSpecial);
  
  // Check if we have meaningful content (not just punctuation and spaces)
  const meaningfulContent = filtered.replace(/[^\w]/g, '');
  const hasContent = meaningfulContent.length > 0;
  
  console.log('[CONTENT-FILTER] Speechable content check:', {
    originalLength: text.length,
    filteredLength: filtered.length,
    meaningfulLength: meaningfulContent.length,
    hasContent
  });
  
  return hasContent;
};

/**
 * Prepare text for display (less aggressive than speech filtering)
 */
export const prepareTextForDisplay = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  // For display, we keep most content but clean up formatting
  return text
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();
};
