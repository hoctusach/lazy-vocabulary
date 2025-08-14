// Update this with your Railway backend URL after deployment
const API_BASE_URL = 'https://your-project.railway.app';

// Add this to your React app's API calls
export const config = {
  apiUrl: API_BASE_URL,
  endpoints: {
    createUser: '/users',
    getVocabulary: (userId) => `/users/${userId}/vocabulary`,
    saveVocabulary: (userId) => `/users/${userId}/vocabulary`
  }
};