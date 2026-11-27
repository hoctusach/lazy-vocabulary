import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deleteAccount, DeleteAccountError } from '@/lib/account/deleteAccount';
import { toCanonical } from '@/lib/nickname';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nickname: string;
}

const DeleteAccountDialog: React.FC<Props> = ({ open, onOpenChange, nickname }) => {
  const [typed, setTyped] = useState('');
  const [passcode, setPasscode] = useState('');
  const [clearLocal, setClearLocal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nicknameMatches = toCanonical(typed) === toCanonical(nickname);
  const canSubmit = nicknameMatches && /^\d{4,10}$/.test(passcode.trim()) && !busy;

  const reset = () => {
    setTyped('');
    setPasscode('');
    setClearLocal(false);
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (busy) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleDelete = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount({ nickname, passcode, clearLocalData: clearLocal });
      toast.success('Your account and progress were deleted.');
      onOpenChange(false);
      reset();
      // Re-mount the app so every screen reflects the signed-out state.
      window.setTimeout(() => window.location.reload(), 400);
    } catch (e) {
      setError(e instanceof DeleteAccountError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete account</DialogTitle>
          <DialogDescription>
            This permanently deletes the nickname <strong>{nickname}</strong>, its passcode, learned words, progress
            and friend-compare link from our server. It cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="mb-1 block">Type your nickname to confirm</span>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" disabled={busy} />
          </label>
          <label className="block">
            <span className="mb-1 block">Passcode</span>
            <Input
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              inputMode="numeric"
              type="password"
              autoComplete="off"
              disabled={busy}
            />
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={clearLocal}
              onChange={(e) => setClearLocal(e.target.checked)}
              disabled={busy}
            />
            <span>
              Also remove imported word sets and local settings from this device. If unchecked, your imported sets
              stay on this device (they are never uploaded) and only your sign-in and cached progress are cleared.
            </span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!canSubmit}>
            {busy ? 'Deleting…' : 'Delete permanently'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteAccountDialog;
