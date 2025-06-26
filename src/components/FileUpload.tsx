
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertTriangle, Shield } from 'lucide-react';
import { useFileUpload } from './file-upload/useFileUpload';
import SecurityInfo from './file-upload/SecurityInfo';
import SecurityWarnings from './file-upload/SecurityWarnings';
import UploadControls from './file-upload/UploadControls';
import FileStatus from './file-upload/FileStatus';
import SecurityTips from './file-upload/SecurityTips';

interface FileUploadProps {
  onFileUploaded: (file: File) => Promise<void>;
  onShowWordCard?: () => void;
  showBackButton?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileUploaded, 
  onShowWordCard, 
  showBackButton = false 
}) => {
  const {
    isUploading,
    filename,
    uploadError,
    securityWarnings,
    handleFileChange,
    handleDownloadSample
  } = useFileUpload({ onFileUploaded });

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardContent className="p-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Upload Vocabulary</h2>
              <Shield className="h-5 w-5 text-green-600" />
            </div>
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
          
          <SecurityInfo />
          
          {/* Upload Error Display */}
          {uploadError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}
          
          <SecurityWarnings warnings={securityWarnings} />
          
          <UploadControls
            onDownloadSample={handleDownloadSample}
            onFileChange={handleFileChange}
            isUploading={isUploading}
          />
          
          <FileStatus filename={filename} isUploading={isUploading} />
          
          <SecurityTips />
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;
