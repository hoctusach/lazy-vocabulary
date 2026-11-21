import React, { useEffect, useState } from 'react';
import { useIsVietnameseDevice } from '@/utils/deviceLanguage';
import { MAX_SLOTS, isValidTime, loadSettings, saveSettings, type ReminderSettings } from '@/lib/reminders/reminderSettings';
import { getReminderPlugin, replanNow, setRemindersEnabled } from '@/lib/reminders/localReminders';

/** More-tab: study reminders toggle + up to 3 time slots. Hidden where there is no plugin (web). */
const RemindersCard: React.FC = () => {
  const isVi = useIsVietnameseDevice();
  const [available, setAvailable] = useState(false);
  const [settings, setSettings] = useState<ReminderSettings>(() => loadSettings());
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let live = true;
    void getReminderPlugin().then(async (p) => {
      if (!live || !p) return;
      setAvailable(true);
      try {
        // Permission revoked in system settings after being on: reflect it.
        if (loadSettings().enabled && (await p.checkPermissions()).display !== 'granted') {
          saveSettings({ ...loadSettings(), enabled: false });
          setSettings(loadSettings());
          setDenied(true);
        }
      } catch {
        // ignore
      }
    });
    return () => { live = false; };
  }, []);

  if (!available) return null;

  const update = (next: ReminderSettings) => {
    setSettings(next);
    saveSettings(next);
    void replanNow();
  };

  const onToggle = async (on: boolean) => {
    setDenied(false);
    const res = await setRemindersEnabled(on);
    setSettings(loadSettings());
    if (on && res === 'denied') setDenied(true);
  };

  const t = isVi
    ? { title: 'Nhắc học', toggle: 'Nhắc học', hint: 'Tối đa 3 lần mỗi ngày, chỉ khi bạn chưa học hôm nay.', denied: 'Chưa có quyền thông báo. Hãy bật trong Cài đặt hệ thống để nhận nhắc học.', slot: 'Lần nhắc', time: 'Giờ nhắc' }
    : { title: 'Study reminders', toggle: 'Study reminders', hint: 'Up to 3 a day, only if you haven’t studied yet today.', denied: 'Notifications are off for this app. Allow them in system settings to get reminders.', slot: 'Reminder', time: 'Reminder time' };

  return (
    <div className="rounded-2xl border p-4 theme-card-surface" style={{ borderColor: 'var(--lv-border-color)' }} data-testid="reminders-card">
      <label className="flex min-h-11 items-center justify-between gap-3">
        <span className="text-base font-semibold" style={{ color: 'var(--lv-heading)' }}>{t.toggle}</span>
        <input
          type="checkbox"
          role="switch"
          className="h-6 w-6"
          data-testid="reminders-toggle"
          aria-label={t.toggle}
          checked={settings.enabled}
          onChange={(e) => void onToggle(e.target.checked)}
        />
      </label>
      <p className="text-sm" style={{ color: 'var(--lv-text-secondary)' }}>{t.hint}</p>
      {denied && (
        <p className="mt-2 text-sm" role="status" data-testid="reminders-denied" style={{ color: 'var(--lv-text-secondary)' }}>{t.denied}</p>
      )}
      {settings.enabled && (
        <ul className="mt-3 space-y-2" data-testid="reminders-slots">
          {settings.slots.slice(0, MAX_SLOTS).map((slot, i) => (
            <li key={i} className="flex min-h-11 items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  data-testid={`reminder-slot-on-${i}`}
                  aria-label={`${t.slot} ${i + 1}`}
                  checked={slot.on}
                  onChange={(e) => update({ ...settings, slots: settings.slots.map((s, j) => (j === i ? { ...s, on: e.target.checked } : s)) })}
                />
                {t.slot} {i + 1}
              </label>
              <input
                type="time"
                className="h-10 rounded-md border px-2 text-sm"
                style={{ borderColor: 'var(--lv-border-color)', background: 'var(--lv-card-bg)', color: 'var(--lv-heading)' }}
                data-testid={`reminder-slot-time-${i}`}
                aria-label={`${t.time} ${i + 1}`}
                value={slot.time}
                disabled={!slot.on}
                onChange={(e) => {
                  if (isValidTime(e.target.value)) update({ ...settings, slots: settings.slots.map((s, j) => (j === i ? { ...s, time: e.target.value } : s)) });
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RemindersCard;
