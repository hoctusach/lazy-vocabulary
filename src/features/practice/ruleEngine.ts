import { defaultPracticeRules, normalizePracticeText, tokenizePracticeText } from './metadata';
import type { PracticeEvaluationResult, PracticeMetadata, PracticeRuleConfig, PracticeRuleId, PracticeRuleOutcome } from './types';

const SUBJECT_CUES = new Set(['i', 'you', 'we', 'they', 'he', 'she', 'it', 'my', 'the', 'a', 'an', 'this', 'that', 'people', 'someone']);
const VERB_CUES = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did', 'have', 'has', 'had', 'will', 'can', 'could', 'should', 'would', 'make', 'made', 'get', 'got']);

const hasVerbCue = (tokens: string[]) => tokens.some((token) => VERB_CUES.has(token) || token.endsWith('ed') || token.endsWith('ing'));
const hasSubjectCue = (tokens: string[]) => tokens.some((token) => SUBJECT_CUES.has(token));

function makeOutcome(rule: PracticeRuleConfig, passed: boolean, feedback: string): PracticeRuleOutcome {
  return {
    id: rule.id,
    label: rule.label,
    passed,
    points: passed ? rule.weight : 0,
    feedback,
  };
}

function evaluateRule(rule: PracticeRuleConfig, transcript: string, metadata: PracticeMetadata): PracticeRuleOutcome {
  const normalized = normalizePracticeText(transcript);
  const tokens = tokenizePracticeText(transcript);
  const acceptedForms = new Set([metadata.lemma, ...metadata.wordForms].map(normalizePracticeText));
  const containsAcceptedForm = tokens.some((token) => acceptedForms.has(token));

  const evaluators: Record<PracticeRuleId, () => PracticeRuleOutcome> = {
    'target-word-exists': () => makeOutcome(
      rule,
      containsAcceptedForm,
      containsAcceptedForm ? `Great — you used “${metadata.lemma}”.` : `Use “${metadata.lemma}” or one of its forms in your sentence.`
    ),
    'correct-word-form': () => makeOutcome(
      rule,
      containsAcceptedForm,
      containsAcceptedForm ? 'The target word form is acceptable.' : `Try one of: ${Array.from(acceptedForms).join(', ')}.`
    ),
    'complete-sentence': () => {
      const passed = tokens.length >= 4 && hasSubjectCue(tokens) && hasVerbCue(tokens);
      return makeOutcome(rule, passed, passed ? 'Your answer looks like a complete sentence.' : 'Add a clear subject and verb to make a complete sentence.');
    },
    'minimum-length': () => {
      const passed = tokens.length >= metadata.minimumSentenceLength;
      return makeOutcome(rule, passed, passed ? 'Good sentence length.' : `Use at least ${metadata.minimumSentenceLength} words.`);
    },
    'basic-grammar': () => {
      const hasRepeatedWord = tokens.some((token, index) => index > 0 && token === tokens[index - 1]);
      const hasEnding = /[.!?]$/.test(transcript.trim());
      const passed = tokens.length > 0 && !hasRepeatedWord && (hasEnding || tokens.length >= metadata.minimumSentenceLength + 2);
      return makeOutcome(rule, passed, passed ? 'No obvious basic grammar issue found.' : 'Check punctuation and avoid accidental repeated words.');
    },
    'collocation-bonus': () => {
      const passed = metadata.collocations.some((phrase) => normalized.includes(normalizePracticeText(phrase)));
      return makeOutcome(rule, passed, passed ? 'Nice collocation usage.' : 'Optional: try a common phrase or collocation with this word.');
    },
    'semantic-match': () => {
      const semanticTerms = [...metadata.semanticTags, ...metadata.semanticKeywords].map(normalizePracticeText).filter(Boolean);
      const passed = semanticTerms.length === 0 || semanticTerms.some((term) => tokens.includes(term) || normalized.includes(term));
      return makeOutcome(rule, passed, passed ? 'Your sentence connects to the word meaning.' : 'Make the context closer to the meaning or example.');
    },
  };

  return evaluators[rule.id]();
}

export function evaluatePracticeSentence(
  transcript: string,
  metadata: PracticeMetadata,
  rules: PracticeRuleConfig[] = defaultPracticeRules
): PracticeEvaluationResult {
  const activeRules = rules.filter((rule) => rule.enabled);
  const allRules = activeRules.map((rule) => evaluateRule(rule, transcript, metadata));
  const normalRules = activeRules.filter((rule) => !rule.bonus);
  const normalMax = normalRules.reduce((sum, rule) => sum + rule.weight, 0) || 1;
  const normalScore = allRules
    .filter((outcome) => !activeRules.find((rule) => rule.id === outcome.id)?.bonus)
    .reduce((sum, outcome) => sum + outcome.points, 0);
  const bonusScore = allRules
    .filter((outcome) => activeRules.find((rule) => rule.id === outcome.id)?.bonus)
    .reduce((sum, outcome) => sum + outcome.points, 0);
  const requiredFailed = allRules.some((outcome) => !outcome.passed && activeRules.find((rule) => rule.id === outcome.id)?.required);
  const rawScore = Math.min(100, Math.round((normalScore / normalMax) * 95 + bonusScore));
  const score = requiredFailed ? Math.min(rawScore, 69) : rawScore;
  const passedRules = allRules.filter((rule) => rule.passed);
  const failedRules = allRules.filter((rule) => !rule.passed);

  return {
    score,
    feedback: [
      score >= 80 ? 'Strong practice sentence. Keep using this word in new contexts.' : 'Good start. Improve the failed items and try again.',
      ...failedRules.slice(0, 3).map((rule) => rule.feedback),
    ],
    passedRules,
    failedRules,
    allRules,
  };
}
