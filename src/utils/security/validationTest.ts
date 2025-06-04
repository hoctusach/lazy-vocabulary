
import { validateVocabularyWord, validateMeaning, validateExample } from './vocabularyValidation';

/**
 * Test function to validate that our patterns work with common dictionary notation
 * This can be called from the console for debugging
 */
export const testValidationPatterns = () => {
  console.log('=== Testing Validation Patterns ===');
  
  // Test cases that should PASS
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
    'naïve'
  ];
  
  const validMeanings = [
    'to stop working or functioning',
    '[intransitive] to become damaged',
    '(formal) a type of dance',
    'used when talking to somebody: "Hello, how are you?"',
    'approximately 50 people'
  ];
  
  const validExamples = [
    'The car broke down on the highway.',
    '[intransitive] She talks to her friends every day.',
    '(formal) "May I help you?" he asked politely.',
    'The population is ~2 million people.'
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
    'word<iframe src="evil.com"></iframe>'
  ];
  
  console.log('\n--- Testing Invalid Inputs (should fail) ---');
  invalidInputs.forEach(input => {
    const result = validateVocabularyWord(input);
    console.log(`"${input}": ${result.isValid ? '❌ SHOULD FAIL' : '✅ CORRECTLY REJECTED'}`, result.errors);
  });
  
  console.log('\n=== Test Complete ===');
};

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testValidationPatterns = testValidationPatterns;
}
