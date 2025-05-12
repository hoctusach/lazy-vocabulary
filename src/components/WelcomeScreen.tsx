
import React from 'react';
import FileUpload from './FileUpload';
import { useUser } from '@/contexts/UserContext';

interface WelcomeScreenProps {
  onFileUploaded: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onFileUploaded }) => {
  const { user } = useUser();
  
  return (
    <>
      <h1 className="text-3xl font-bold text-center">Lazy Vocabulary</h1>
      
      {user && (
        <p className="text-center text-blue-600 mt-2">
          Welcome back, {user.name}!
        </p>
      )}
      
      <p className="text-center text-muted-foreground mt-4">
        Upload your Excel file to get started with vocabulary learning
      </p>
      <FileUpload onFileUploaded={onFileUploaded} />
    </>
  );
};

export default WelcomeScreen;
