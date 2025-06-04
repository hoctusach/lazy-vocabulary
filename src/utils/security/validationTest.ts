
import { validateVocabularyWord, validateMeaning, validateExample } from './vocabularyValidation';

/**
 * Test function to validate that our patterns work with comprehensive dictionary notation
 * This can be called from the console for debugging
 */
export const testValidationPatterns = () => {
  console.log('=== Testing Comprehensive Validation Patterns ===');
  
  // Test cases that should PASS - including IPA and advanced linguistic notation
  const validWords = [
    'water',
    'break [intransitive]',
    'talk (with somebody)',
    'café',
    'résumé',
    'mother-in-law',
    'twenty-first',
    "can't",
    'hello/goodbye',
    'approximately ~50',
    'naïve',
    // IPA phonetic examples
    'water /ˈwɔːtər/',
    'beautiful /ˈbjuːtɪfəl/',
    'pronunciation /prəˌnʌnsiˈeɪʃən/',
    // Advanced linguistic notation
    'go [phrasal verb]',
    'break down [separable]',
    'put up with [inseparable]',
    'weather /ˈweðər/ (AmE)',
    'colour /ˈkʌlər/ (BrE)',
    // Stress and tone marks
    'Mandarin tones: mā má mǎ mà',
    'stress: ˈprimary ˌsecondary',
    // Extended Unicode
    'naïveté',
    'résumé',
    'façade',
    'piñata',
    'jalapeño'
  ];
  
  const validMeanings = [
    'to stop working or functioning',
    '[intransitive] to become damaged',
    '(formal) a type of dance',
    'used when talking to somebody: "Hello, how are you?"',
    'approximately 50 people',
    // With IPA notation
    'pronounced /ˈwɔːtər/ in American English',
    'stress on first syllable: ˈbeautiful',
    // Complex grammatical information
    '[countable, uncountable] (formal) used before noun',
    '(especially AmE) (BrE usually colour)',
    // Mathematical and special symbols
    'temperature: 20°C (68°F)',
    'percentage: 50% of students',
    'approximately ≈ 100 people',
    'greater than > 50'
  ];
  
  const validExamples = [
    'The car broke down on the highway.',
    '[intransitive] She talks to her friends every day.',
    '(formal) "May I help you?" he asked politely.',
    'The population is ~2 million people.',
    // Complex examples with multiple notation types
    'Pronunciation: water /ˈwɔːtər/ (AmE) vs /ˈwɔːtə/ (BrE)',
    'Stress pattern: ˈbeautiful (primary stress on first syllable)',
    'Usage: "Can I have some water?" (AmE) vs "May I have some water?" (formal)',
    // Examples with various symbols
    'Temperature dropped to -5°C (23°F)',
    'Success rate: 85% ± 3%',
    'Formula: H₂O (water)',
    'Ratio: 3:1 (three to one)'
  ];
  
  console.log('\n--- Testing Valid Words ---');
  validWords.forEach(word => {
    const result = validateVocabularyWord(word);
    console.log(`"${word}": ${result.isValid ? '✅ PASS' : '❌ FAIL'}`, result.isValid ? '' : result.errors);
  });
  
  console.log('\n--- Testing Valid Meanings ---');
  validMeanings.forEach(meaning => {
    const result = validateMeaning(meaning);
    console.log(`"${meaning}": ${result.isValid ? '✅ PASS' : '❌ FAIL'}`, result.isValid ? '' : result.errors);
  });
  
  console.log('\n--- Testing Valid Examples ---');
  validExamples.forEach(example => {
    const result = validateExample(example);
    console.log(`"${example}": ${result.isValid ? '✅ PASS' : '❌ FAIL'}`, result.isValid ? '' : result.errors);
  });
  
  // Test cases that should FAIL (malicious content)
  const invalidInputs = [
    '<script>alert("xss")</script>',
    'javascript:alert(1)',
    'word onclick="alert(1)"',
    'SELECT * FROM users',
    'word<iframe src="evil.com"></iframe>',
    '<img src="x" onerror="alert(1)">',
    'DROP TABLE vocabulary;',
    'UNION SELECT password FROM users',
    '<form action="evil.com">',
    'vbscript:msgbox("xss")'
  ];
  
  console.log('\n--- Testing Invalid Inputs (should fail) ---');
  invalidInputs.forEach(input => {
    const result = validateVocabularyWord(input);
    console.log(`"${input}": ${result.isValid ? '❌ SHOULD FAIL' : '✅ CORRECTLY REJECTED'}`, result.errors);
  });
  
  console.log('\n=== Comprehensive Test Complete ===');
  console.log('You can now test your vocabulary data in the app.');
  console.log('Check console for detailed validation logs when processing words.');
};

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testValidationPatterns = testValidationPatterns;
}
