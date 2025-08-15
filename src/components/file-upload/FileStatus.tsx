
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

interface FileStatusProps {
  filename: string | null;
  isUploading: boolean;
}

const FileStatus: React.FC<FileStatusProps> = ({ filename, isUploading }) => {
  if (!filename) return null;

  return (
    <div className="flex items-center gap-2 mt-2">
      <FileText size={16} className="text-blue-500" />
      <span className="text-sm truncate">{filename}</span>
      <Badge variant="outline" className="ml-auto">
        {isUploading ? 'Processing...' : 'Validated'}
      </Badge>
    </div>
  );
};

export default FileStatus;
