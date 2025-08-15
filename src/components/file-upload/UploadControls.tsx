
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';

interface UploadControlsProps {
  onDownloadSample: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
}

const UploadControls: React.FC<UploadControlsProps> = ({
  onDownloadSample,
  onFileChange,
  isUploading
}) => {
  return (
    <div className="flex flex-col gap-3 mt-4">
      <Button 
        variant="outline" 
        className="w-full flex justify-center items-center gap-2"
        onClick={onDownloadSample}
      >
        <Download size={16} /> Download Sample
      </Button>
      
      <div className="relative">
        <input
          type="file"
          accept=".xlsx,.xls,.csv,.json"
          onChange={onFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        <Button 
          variant="default" 
          className="w-full flex justify-center items-center gap-2"
          disabled={isUploading}
        >
          <Upload size={16} /> 
          {isUploading ? 'Uploading & Validating...' : 'Upload New File'}
        </Button>
      </div>
    </div>
  );
};

export default UploadControls;
