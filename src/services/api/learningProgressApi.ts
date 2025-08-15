// API client for the new Learning Progress backend service
export interface BackendDailyListResponse {
  new_words: string[];
  review_words: string[];
}

export interface BackendStatsResponse {
  total_words: number;
  accuracy_rate: number;
  words_mastered: number;
  reviews_today: number;
}

export interface BackendReviewEvent {
  word_id: string;
  is_correct: boolean;
  response_time_ms: number;
}

export class LearningProgressApi {
  private baseUrl = 'http://localhost:8000/api/progress'; // Backend URL
  private userId = 'Admin'; // Default user for demo

  async generateDailyList(severity: 'light' | 'moderate' | 'intense'): Promise<BackendDailyListResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.userId}/daily-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ severity })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Backend API unavailable, using fallback');
      // Fallback to mock data for demo
      return this.getMockDailyList(severity);
    }
  }

  async recordReviewEvents(sessionId: string, events: BackendReviewEvent[]): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/${this.userId}/review-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, events })
      });
    } catch (error) {
      console.warn('Failed to record review events:', error);
    }
  }

  async getUserStatistics(): Promise<BackendStatsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.userId}/statistics`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn('Backend API unavailable, using fallback stats');
      return this.getMockStats();
    }
  }

  private getMockDailyList(severity: string): BackendDailyListResponse {
    const counts = { light: 20, moderate: 40, intense: 75 };
    const totalCount = counts[severity as keyof typeof counts] || 40;
    
    const allWords = [
      'take_off', 'put_on', 'look_up', 'turn_down', 'give_up',
      'break_the_ice', 'hit_the_nail', 'piece_of_cake',
      'environment', 'technology', 'education', 'health', 'business',
      'present_perfect', 'passive_voice',
      'make_a_decision', 'take_responsibility',
      'happiness', 'successful', 'organization'
    ];
    
    const shuffled = [...allWords].sort(() => Math.random() - 0.5);
    const newCount = Math.floor(totalCount * 0.4);
    const reviewCount = totalCount - newCount;
    
    return {
      new_words: shuffled.slice(0, Math.min(newCount, shuffled.length)),
      review_words: shuffled.slice(newCount, Math.min(totalCount, shuffled.length))
    };
  }

  private getMockStats(): BackendStatsResponse {
    return {
      total_words: 15,
      accuracy_rate: 78.5,
      words_mastered: 3,
      reviews_today: 8
    };
  }
}

export const learningProgressApi = new LearningProgressApi();