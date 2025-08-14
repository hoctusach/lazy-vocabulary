const API_BASE_URL = 'http://localhost:8001';

export interface User {
  user_id: string;
  email: string;
  nickname: string;
}

export interface Session {
  session_id: string;
  user_id: string;
  token: string;
  expires_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class UserService {
  async register(email: string, nickname: string, password: string): Promise<ApiResponse<User>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nickname, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.detail || `Server error: ${response.status}` };
      }
      
      const data = await response.json();
      return { 
        success: true, 
        data: {
          user_id: data.user_id,
          email: data.email,
          nickname: data.nickname
        }
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Unable to connect to server. Please make sure the backend is running.' };
    }
  }

  async login(email: string, password: string): Promise<ApiResponse<Session>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password,
          device_type: 'web',
          user_agent: navigator.userAgent,
          ip_address: '127.0.0.1'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.detail || `Server error: ${response.status}` };
      }
      
      const data = await response.json();
      return { 
        success: true, 
        data: {
          session_id: data.session_id,
          user_id: data.user_id,
          token: data.token,
          expires_at: data.expires_at
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Unable to connect to server. Please make sure the backend is running.' };
    }
  }

  async validateSession(token: string): Promise<ApiResponse<{ valid: boolean; user_id?: string; session_id?: string }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      if (!response.ok) {
        return { success: true, data: { valid: false } };
      }
      
      const data = await response.json();
      return { 
        success: true, 
        data: {
          valid: data.is_valid,
          user_id: data.user_id,
          session_id: data.session_id
        }
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return { success: true, data: { valid: false } };
    }
  }

  async logout(sessionId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
      
      if (!response.ok) {
        return { success: false, error: `Server error: ${response.status}` };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async recordReview(userId: string, wordId: string, accuracy: boolean, responseTime: number): Promise<ApiResponse<any>> {
    // TODO: Implement when Learning Progress Unit is ready
    return { success: true, data: { message: 'Review recorded locally' } };
  }
}

export const userService = new UserService();