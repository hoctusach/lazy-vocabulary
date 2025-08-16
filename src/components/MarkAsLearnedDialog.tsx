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

interface MarkAsLearnedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  word: string;
}

export const MarkAsLearnedDialog: React.FC<MarkAsLearnedDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  word
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark as Learned</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to mark "{word}" as learned?
            <br /><br />
            This word will be hidden from your daily practice and will automatically
            reappear after 100 days for review.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Mark as Learned</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
