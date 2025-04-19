
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Upload, FileText, ArrowLeft } from 'lucide-react';
import { vocabularyService } from '@/services/vocabularyService';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_VOCABULARY_DATA } from '@/data/defaultVocabulary';

interface FileUploadProps {
  onFileUploaded: () => void;
  onShowWordCard?: () => void;
  showBackButton?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileUploaded, 
  onShowWordCard, 
  showBackButton = false 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFilename(file.name);

    try {
      const success = await vocabularyService.processExcelFile(file);
      
      if (success) {
        toast({
          title: "File Uploaded Successfully",
          description: `Uploaded ${file.name}`,
        });
        onFileUploaded();
      } else {
        toast({
          title: "Upload Failed",
          description: "Could not process the Excel file. Please check the format.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload Error",
        description: "An error occurred while uploading the file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadSample = () => {
    window.open(
      "https://docs.google.com/spreadsheets/d/1xf4SdYC8885ytUcJna6klgH7tBbZFqmv/edit?usp=sharing&ouid=100038336490831315796&rtpof=true&sd=true", 
      "_blank"
    );
  };

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Upload Vocabulary</h2>
            {showBackButton && onShowWordCard && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onShowWordCard}
                className="flex items-center gap-1"
              >
                <ArrowLeft size={16} />
                Back
              </Button>
            )}
          </div>
          
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              variant="outline" 
              className="w-full flex justify-center items-center gap-2"
              onClick={handleDownloadSample}
            >
              <Download size={16} /> Download Sample
            </Button>
            
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.json"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <Button 
                variant="default" 
                className="w-full flex justify-center items-center gap-2"
                disabled={isUploading}
              >
                <Upload size={16} /> Upload New File
              </Button>
            </div>
            
            {filename && (
              <div className="flex items-center gap-2 mt-2">
                <FileText size={16} className="text-blue-500" />
                <span className="text-sm truncate">{filename}</span>
                <Badge variant="outline" className="ml-auto">
                  {isUploading ? 'Uploading...' : 'Uploaded'}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;
