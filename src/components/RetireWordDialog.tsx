import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RetireWordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  wordText: string;
}

export const RetireWordDialog: React.FC<RetireWordDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  wordText
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retire Word</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to retire "{wordText}"? 
            <br /><br />
            This word will be hidden from your daily practice and will automatically 
            reappear after 100 days for review.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Retire Word</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};