/**
 * Backend API client for Lazy Vocabulary
 */

const API_BASE_URL = 'http://localhost:8000/api';

export interface VocabularyWord {
  word_id: string;
  word_text: string;
  meaning: string;
  example?: string;
  translation?: string;
}

export interface Category {
  category_id: string;
  name: string;
  description?: string;
}

class BackendClient {
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    return response.json();
  }

  // Vocabulary endpoints
  async getCategories(): Promise<Category[]> {
    const result = await this.request('/vocabulary/categories');
    return result.success ? result.data : [];
  }

  async getWordsByCategory(categoryId: string): Promise<VocabularyWord[]> {
    const result = await this.request(`/vocabulary/categories/${categoryId}/words`);
    return result.success ? result.data : [];
  }

  async searchVocabulary(query: string): Promise<VocabularyWord[]> {
    const result = await this.request(`/vocabulary/search?q=${encodeURIComponent(query)}`);
    return result.success ? result.data : [];
  }

  async addVocabularyWord(wordData: {
    word_text: string;
    meaning: string;
    category_id: string;
    example?: string;
    translation?: string;
  }): Promise<any> {
    return this.request('/vocabulary/words', {
      method: 'POST',
      body: JSON.stringify(wordData),
    });
  }

  // User endpoints
  async registerUser(userData: {
    email: string;
    nickname: string;
    password: string;
  }): Promise<any> {
    return this.request('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async loginUser(credentials: {
    email: string;
    password: string;
    device_info?: string;
  }): Promise<any> {
    return this.request('/users/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  // Learning endpoints
  async getDailyLearningList(userId: string, size: number = 20): Promise<VocabularyWord[]> {
    const result = await this.request(`/learning/daily-list/${userId}?size=${size}`);
    return result.success ? result.data : [];
  }

  async recordReviewEvent(reviewData: {
    user_id: string;
    word_id: string;
    response_accuracy: boolean;
    response_time_ms: number;
  }): Promise<any> {
    return this.request('/learning/review', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  }
}

export const backendClient = new BackendClient();