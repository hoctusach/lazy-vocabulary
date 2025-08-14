// Railway backend URL
export const API_CONFIG = {
  BASE_URL: 'https://lazyvoca-production.up.railway.app',
  ENDPOINTS: {
    HEALTH: '/',
    CREATE_USER: '/users',
    GET_VOCABULARY: (userId: number) => `/users/${userId}/vocabulary`,
    SAVE_VOCABULARY: (userId: number) => `/users/${userId}/vocabulary`
  }
};

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  return response.json();
};