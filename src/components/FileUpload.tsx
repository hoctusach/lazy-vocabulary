import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FilePlus2, Download } from 'lucide-react';
import { vocabularyService } from '@/services/vocabularyService';
import { useToast } from '@/components/ui/use-toast';

interface FileUploadProps {
  onFileUploaded: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const DEFAULT_VOCAB_DOWNLOAD_URL = "https://docs.google.com/spreadsheets/d/1xf4SdYC8885ytUcJna6klgH7tBbZFqmv/edit?usp=sharing&ouid=100038336490831315796&rtpof=true&sd=true";
  
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
  
  const handleDownloadAndUpload = async () => {
    try {
      toast({
        title: "Downloading template",
        description: "Please wait while we download and process the template...",
      });

      const response = await fetch(DEFAULT_VOCAB_DOWNLOAD_URL);
      const blob = await response.blob();
      const file = new File([blob], "vocabulary_template.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      await processFile(file);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download and process the template. Please try manually downloading.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Vocabulary</CardTitle>
        <CardDescription className="flex justify-between items-center">
          <div>
            <p>Prepare your Excel file for vocabulary learning</p>
            <p className="text-xs text-muted-foreground mt-1">
              Note: Your uploaded Excel file is stored only on your device. 
              No cloud storage or external data transmission occurs.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDownloadAndUpload}
          >
            <Download size={16} className="mr-2" /> Use default word set
          </Button>
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
