export interface QuizQuestion {
  id: string;
  word: string;
  example?: string;
  correctMeaning: string;
  options: string[];
}

export interface QuizResult {
  total: number;
  correct: number;
}
