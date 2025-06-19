
import { useState } from 'react';
import { vocabularyService } from '@/services/vocabularyService';
import { useToast } from '@/hooks/use-toast';
import { validateFileUpload, RateLimiter } from '@/utils/security/inputValidation';
import { createSafeExternalLink } from '@/utils/security/contentSecurity';

// Rate limiter for file uploads
const uploadRateLimiter = new RateLimiter(3, 300000); // 3 uploads per 5 minutes

interface UseFileUploadProps {
  onFileUploaded: (file: File) => Promise<void>;
}

export const useFileUpload = ({ onFileUploaded }: UseFileUploadProps) => {
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
        // Call the callback with the file
        await onFileUploaded(file);
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

  return {
    isUploading,
    filename,
    uploadError,
    securityWarnings,
    handleFileChange,
    handleDownloadSample
  };
};
