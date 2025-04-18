import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FilePlus2 } from 'lucide-react';
import { vocabularyService } from '@/services/vocabularyService';
import { useToast } from '@/components/ui/use-toast';

interface FileUploadProps {
  onFileUploaded: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await processFile(file);
    }
  };
  
  const processFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      toast({
        title: "Invalid file format",
        description: "Please upload an Excel file (.xlsx)",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Processing file",
      description: "Please wait while we process your Excel file..."
    });
    
    const success = await vocabularyService.processExcelFile(file);
    
    if (success) {
      toast({
        title: "Success!",
        description: "Your vocabulary data has been loaded successfully.",
      });
      if (inputRef.current) inputRef.current.value = '';
      onFileUploaded();
    } else {
      toast({
        title: "Error",
        description: "Failed to process the Excel file. Please check the format and try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleButtonClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };
  
  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Vocabulary</CardTitle>
        <CardDescription>
          Prepare your Excel file for vocabulary learning
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center gap-4"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <FilePlus2 size={40} className="text-muted-foreground" />
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Drag and drop your Excel file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supports .xlsx files with sheets: "All words", "phrasal verbs", "idioms", "advanced words"
            </p>
            <p className="text-xs text-yellow-600 mt-2">
              Note: This file is stored locally on your device. We do not save or upload it to any cloud service.
            </p>
          </div>
          <Input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleButtonClick} className="w-full">
          <Upload size={16} className="mr-2" />
          Upload Excel File
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FileUpload;
