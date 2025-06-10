
import React from 'react';
import FileUpload from './FileUpload';

interface WelcomeScreenProps {
  onFileUploaded: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onFileUploaded }) => {
  // Create a wrapper function that matches the new FileUpload signature
  const handleFileUploaded = async (file: File) => {
    // Call the original callback without the file parameter
    onFileUploaded();
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-center">Lazy Vocabulary</h1>
      <p className="text-center text-muted-foreground">
        Upload your Excel file to get started with vocabulary learning
      </p>
      <FileUpload onFileUploaded={handleFileUploaded} />
    </>
  );
};

export default WelcomeScreen;
