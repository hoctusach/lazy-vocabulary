
import React from 'react';
import FileUpload from './FileUpload';

interface WelcomeScreenProps {
  onFileUploaded: (file: File) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onFileUploaded }) => {
  return (
    <>
      <h1 className="text-3xl font-bold text-center">Lazy Vocabulary</h1>
      <p className="text-center text-muted-foreground">
        Upload your Excel file to get started with vocabulary learning
      </p>
      <FileUpload onFileUploaded={onFileUploaded} />
    </>
  );
};

export default WelcomeScreen;
