import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import DeleteAccountDialog from '@/components/mobile/DeleteAccountDialog';
import { DELETE_ACCOUNT_URL, PRIVACY_POLICY_URL } from '@/config/links';
import { getNicknameLocal } from '@/lib/nickname';
import { NICKNAME_EVENT_NAME } from '@/lib/nicknameEvents';
import { adsEnabled, loadAdsService } from '@/services/ads';

const PrivacyAndAccountCard: React.FC = () => {
  const [nickname, setNickname] = useState<string | null>(() => getNicknameLocal()?.trim() || null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const showAdChoices = adsEnabled();

  useEffect(() => {
    const sync = () => setNickname(getNicknameLocal()?.trim() || null);
    window.addEventListener(NICKNAME_EVENT_NAME, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(NICKNAME_EVENT_NAME, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const openAdChoices = async () => {
    try {
      const svc = await loadAdsService();
      const result = await svc.openPrivacyOptions();
      if (result === 'not-required') toast.info('No ad privacy choices are required in your region.');
      else if (result === 'unavailable') toast.error('Ad privacy choices are not available right now. Try again later.');
    } catch {
      toast.error('Ad privacy choices are not available right now.');
    }
  };

  return (
    <div
      className="rounded-2xl border p-4 text-sm theme-card-surface"
      style={{ borderColor: 'var(--lv-border-color)' }}
      data-section="privacy-account"
    >
      <h3 className="mb-2 font-semibold" style={{ color: 'var(--lv-heading)' }}>
        Privacy &amp; account
      </h3>
      <ul className="space-y-2">
        <li>
          <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
            Privacy policy
          </a>
        </li>
        {showAdChoices && (
          <li>
            <button type="button" onClick={openAdChoices} className="font-medium text-blue-600 hover:underline">
              Privacy / ad choices
            </button>
          </li>
        )}
        <li>
          <a href={DELETE_ACCOUNT_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
            How to delete your account
          </a>
        </li>
      </ul>
      {nickname && (
        <div className="mt-3">
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            Delete account
          </Button>
          <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} nickname={nickname} />
        </div>
      )}
    </div>
  );
};

export default PrivacyAndAccountCard;
