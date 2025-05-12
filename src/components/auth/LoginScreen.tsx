
import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { handleGoogleLogin } from '@/services/authService';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';

const LoginScreen: React.FC = () => {
  const { setUser } = useUser();

  const onLoginSuccess = (credentialResponse: any) => {
    try {
      const user = handleGoogleLogin(credentialResponse);
      setUser(user);
      toast.success(`Signed in as ${user.name}`);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to sign in with Google');
    }
  };

  const onLoginError = () => {
    toast.error('Google sign-in failed');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-center">Lazy Vocabulary</h1>
          <p className="mt-2 text-gray-600">Master vocabulary with passive learning</p>
        </div>
        
        <div className="mt-8 space-y-6">
          <div className="flex flex-col items-center">
            <h2 className="text-xl mb-4">Sign in to continue</h2>
            <GoogleLogin
              onSuccess={onLoginSuccess}
              onError={onLoginError}
              useOneTap
            />
          </div>
        </div>
        
        <div className="mt-8 text-sm text-center text-gray-500">
          <p>Sign in to save your vocabulary progress across devices</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
