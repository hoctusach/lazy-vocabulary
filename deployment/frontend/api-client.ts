import { config } from './config';

class ApiClient {
  private baseUrl = config.API_BASE_URL;
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    return response.json();
  }

  async createUser(email: string, nickname: string) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify({ email, nickname }),
    });
  }

  async getVocabulary(userId: number) {
    return this.request(`/users/${userId}/vocabulary`);
  }

  async saveVocabulary(userId: number, progress: any) {
    return this.request(`/users/${userId}/vocabulary`, {
      method: 'POST',
      body: JSON.stringify({ progress, settings: {} }),
    });
  }
}

export const apiClient = new ApiClient();