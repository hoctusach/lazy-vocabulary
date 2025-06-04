
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Upload, FileText, ArrowLeft, AlertTriangle, Shield } from 'lucide-react';
import { vocabularyService } from '@/services/vocabularyService';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_VOCABULARY_DATA } from '@/data/defaultVocabulary';
import { validateFileUpload, RateLimiter } from '@/utils/security/inputValidation';
import { createSafeExternalLink } from '@/utils/security/contentSecurity';

interface FileUploadProps {
  onFileUploaded: () => void;
  onShowWordCard?: () => void;
  showBackButton?: boolean;
}

// Rate limiter for file uploads
const uploadRateLimiter = new RateLimiter(3, 300000); // 3 uploads per 5 minutes

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileUploaded, 
  onShowWordCard, 
  showBackButton = false 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset previous errors and warnings
    setUploadError('');
    setSecurityWarnings([]);

    // Rate limiting check
    if (!uploadRateLimiter.isAllowed('file-upload')) {
      setUploadError('Too many upload attempts. Please wait before trying again.');
      return;
    }

    // Validate file before processing
    const fileValidation = validateFileUpload(file);
    if (!fileValidation.isValid) {
      setUploadError(fileValidation.errors.join('. '));
      return;
    }

    setIsUploading(true);
    setFilename(file.name);

    try {
      // Additional security checks
      const warnings: string[] = [];
      
      // Check for suspicious file patterns
      if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
        warnings.push('Filename contains path traversal characters');
      }
      
      // Check file size more granularly
      if (file.size > 5 * 1024 * 1024) { // 5MB
        warnings.push('Large file detected - processing may take longer');
      }
      
      // Check for potentially malicious extensions in filename
      const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.js', '.vbs'];
      if (suspiciousExtensions.some(ext => file.name.toLowerCase().includes(ext))) {
        warnings.push('Filename contains potentially suspicious extension patterns');
      }
      
      setSecurityWarnings(warnings);
      
      // Create a timeout for the upload process
      const uploadTimeout = setTimeout(() => {
        setIsUploading(false);
        setUploadError('Upload timeout. Please try again with a smaller file.');
      }, 30000); // 30 second timeout
      
      const success = await vocabularyService.processExcelFile(file);
      clearTimeout(uploadTimeout);
      
      if (success) {
        toast({
          title: "File Uploaded Successfully",
          description: `Uploaded ${file.name} with security validation`,
        });
        onFileUploaded();
      } else {
        setUploadError("Could not process the Excel file. Please check the format and try again.");
        toast({
          title: "Upload Failed",
          description: "Could not process the Excel file. Please check the format.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadError("An error occurred while uploading the file. Please try again.");
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
    const sampleUrl = "https://docs.google.com/spreadsheets/d/1xf4SdYC8885ytUcJna6klgH7tBbZFqmv/edit?usp=sharing&ouid=100038336490831315796&rtpof=true&sd=true";
    const safeLink = createSafeExternalLink(sampleUrl);
    
    if (safeLink) {
      // Create a temporary link element for safe external navigation
      const link = document.createElement('a');
      link.href = safeLink.href;
      link.rel = safeLink.rel;
      link.target = safeLink.target;
      link.click();
    } else {
      toast({
        title: "Error",
        description: "Invalid sample file URL",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardContent className="p-6">
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
          
          {/* Security Information */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Secure Upload</p>
                <p>Files are validated for security. Only .xlsx, .xls, .csv, and .json files up to 10MB are accepted.</p>
              </div>
            </div>
          </div>
          
          {/* Upload Error Display */}
          {uploadError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}
          
          {/* Security Warnings */}
          {securityWarnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Security Notices:</p>
                <ul className="list-disc list-inside mt-1">
                  {securityWarnings.map((warning, index) => (
                    <li key={index} className="text-sm">{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
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
                <Upload size={16} /> 
                {isUploading ? 'Uploading & Validating...' : 'Upload New File'}
              </Button>
            </div>
            
            {filename && (
              <div className="flex items-center gap-2 mt-2">
                <FileText size={16} className="text-blue-500" />
                <span className="text-sm truncate">{filename}</span>
                <Badge variant="outline" className="ml-auto">
                  {isUploading ? 'Processing...' : 'Validated'}
                </Badge>
              </div>
            )}
          </div>
          
          {/* Security Tips */}
          <div className="text-xs text-gray-600 mt-4 p-3 bg-gray-50 rounded">
            <p className="font-medium">Security Tips:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Only upload files from trusted sources</li>
              <li>Ensure your files don't contain sensitive personal information</li>
              <li>Large files may take longer to process and validate</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;
