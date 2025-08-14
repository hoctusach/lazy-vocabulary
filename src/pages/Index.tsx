
import React from 'react';
import VocabularyApp from '@/components/VocabularyApp';
import VoiceDebugPanel from '@/components/VoiceDebugPanel';
import DebugPanel from '@/components/DebugPanel';
import UserAuth from '@/components/UserAuth';
import { useUserAuth } from '@/hooks/useUserAuth';

const Index = () => {
  const { currentUser, login, logout, isLoggedIn, isLoading } = useUserAuth();

  // Show loading while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-blue-900 mb-2">Lazy Vocabulary</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-4">
        <div className="w-full max-w-md px-4">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-blue-900">Lazy Vocabulary</h1>
            <h2 className="text-[#333333] mt-2 text-sm font-medium">
              Master vocabulary with passive learning!
            </h2>
            <p className="slogan-note mt-2">
              Just skim the word and speak it—let it stick naturally!
            </p>
          </div>
          <UserAuth 
            onUserLogin={login}
            currentUser={currentUser}
            onLogout={logout}
          />
        </div>
      </div>
    );
  }

  // Show main app when logged in
  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <header className="mb-4">
        <div className="flex justify-between items-center max-w-4xl mx-auto px-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-center text-blue-900">Lazy Vocabulary</h1>
            <h2 className="text-center text-[#333333] mt-1 text-sm font-medium">
              Master vocabulary with passive learning!
            </h2>
            <p className="slogan-note">
              Just skim the word and speak it—let it stick naturally!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Hi, {currentUser?.nickname}!
            </span>
            <UserAuth 
              onUserLogin={login}
              currentUser={currentUser}
              onLogout={logout}
            />
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-2">
        <VocabularyApp />
      </main>
      
      <footer className="mt-6 text-center text-sm text-muted-foreground">
        <p>© 2025 Lazy Vocabulary - hoctusach@gmail.com</p>
      </footer>
      <VoiceDebugPanel />
      <DebugPanel />
    </div>
  );
};

export default Index;
