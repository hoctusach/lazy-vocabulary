import { useState, useEffect } from 'react';
import { type User, type Session, userService } from '@/services/api/userService';

export function useUserAuth() {
  const [currentUser, setCurrentUser] = useState<User | undefined>();
  const [currentSession, setCurrentSession] = useState<Session | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved session on app start
    const loadSavedSession = async () => {
      try {
        const savedUser = localStorage.getItem('lazy-vocab-user');
        const savedSession = localStorage.getItem('lazy-vocab-session');
        
        if (savedUser && savedSession) {
          const user = JSON.parse(savedUser);
          const session = JSON.parse(savedSession);
          
          // Check if session is still valid (not expired)
          if (new Date(session.expires_at) > new Date()) {
            // Validate with backend
            const validation = await userService.validateSession(session.token);
            if (validation.success && validation.data?.valid) {
              setCurrentUser(user);
              setCurrentSession(session);
            } else {
              // Clear invalid session
              localStorage.removeItem('lazy-vocab-user');
              localStorage.removeItem('lazy-vocab-session');
            }
          } else {
            // Clear expired session
            localStorage.removeItem('lazy-vocab-user');
            localStorage.removeItem('lazy-vocab-session');
          }
        }
      } catch (error) {
        console.error('Error loading saved session:', error);
        localStorage.removeItem('lazy-vocab-user');
        localStorage.removeItem('lazy-vocab-session');
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedSession();
  }, []);

  const login = (user: User, session: Session) => {
    setCurrentUser(user);
    setCurrentSession(session);
    localStorage.setItem('lazy-vocab-user', JSON.stringify(user));
    localStorage.setItem('lazy-vocab-session', JSON.stringify(session));
  };

  const loginWithSession = (session: Session) => {
    // For admin bypass, create a user object
    const adminUser: User = {
      user_id: session.user_id,
      email: session.user_id === 'admin-user' ? 'admin@localhost' : 'unknown@localhost',
      nickname: session.user_id === 'admin-user' ? 'Admin' : 'User'
    };
    login(adminUser, session);
  };

  const logout = async () => {
    if (currentSession) {
      try {
        await userService.logout(currentSession.session_id);
      } catch (error) {
        console.error('Backend logout error:', error);
      }
    }
    setCurrentUser(undefined);
    setCurrentSession(undefined);
    localStorage.removeItem('lazy-vocab-user');
    localStorage.removeItem('lazy-vocab-session');
  };

  return {
    currentUser,
    currentSession,
    isLoading,
    login,
    loginWithSession,
    logout,
    isLoggedIn: !!currentUser
  };
}