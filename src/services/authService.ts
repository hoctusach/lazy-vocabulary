
import jwtDecode from 'jwt-decode';

export interface GooglePayload { 
  email: string; 
  name: string; 
  sub: string; 
  picture?: string; 
}

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
  picture?: string;
}

export function handleGoogleLogin(response: { credential: string }): AuthUser {
  try {
    const payload = jwtDecode<GooglePayload>(response.credential);
    const userId = payload.sub;
    
    // Save user info in localStorage
    localStorage.setItem('userId', userId);
    localStorage.setItem('userName', payload.name);
    localStorage.setItem('userEmail', payload.email);
    if (payload.picture) {
      localStorage.setItem('userPicture', payload.picture);
    }
    
    return {
      userId,
      name: payload.name,
      email: payload.email,
      picture: payload.picture
    };
  } catch (error) {
    console.error('Error processing Google login:', error);
    throw new Error('Failed to process login credentials');
  }
}

export function getCurrentUser(): AuthUser | null {
  const userId = localStorage.getItem('userId');
  if (!userId) return null;
  
  return {
    userId,
    name: localStorage.getItem('userName') || 'User',
    email: localStorage.getItem('userEmail') || '',
    picture: localStorage.getItem('userPicture') || undefined
  };
}

export function signOut(): void {
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userPicture');
}

export function isAuthenticated(): boolean {
  return localStorage.getItem('userId') !== null;
}
