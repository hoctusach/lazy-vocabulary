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

interface MarkAsNewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  word: string;
}

export const MarkAsNewDialog: React.FC<MarkAsNewDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  word
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark as New</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to mark "{word}" as new?
            <br /><br />
            This word will re-enter your learning queue and appear in daily selections.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Mark as New</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
