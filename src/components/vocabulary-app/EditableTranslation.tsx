import React from 'react';
import { Lock, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProFeature } from '@/services/billing/proFeatures';
import { openProUpgrade } from '@/services/billing/proUpgradeStore';
import {
  TRANSLATION_OVERRIDE_EVENT,
  MAX_TRANSLATION_CHARS,
  getTranslationOverride,
  setTranslationOverride,
  type WordIdentity,
} from '@/lib/translations/translationOverrides';
import { useIsVietnameseDevice } from '@/utils/deviceLanguage';
import { guessLang } from '@/lib/translations/textDirection';
import { emitTranslationEdit, SAVED_CONFIRM_MS } from '@/lib/translations/translationEditSignal';

interface Props extends WordIdentity {
  /** The shared (default / imported) translation. Never modified. */
  translation?: string;
  /** Show the Pro edit control. The search preview is read-only. */
  editable?: boolean;
  /** UI language for labels; defaults to the device language. */
  isVi?: boolean;
  color?: string;
}

/**
 * The translation line of a word card. Pro users get an in-place editor (no popup, multi-line, line breaks kept);
 * the edit is saved as a per-user override. Free users see the text read-only plus a Pro lock on the edit control.
 */
const EditableTranslation: React.FC<Props> = ({ word, category, sourceId, translation, editable = true, isVi: isViProp, color }) => {
  const deviceIsVi = useIsVietnameseDevice();
  const isVi = isViProp ?? deviceIsVi;
  const canEdit = useProFeature('editTranslation');
  const identity = React.useMemo(() => ({ word, category, sourceId }), [word, category, sourceId]);
  const idKey = `${sourceId ?? ''}|${category ?? ''}|${word}`;
  const [override, setOverride] = React.useState<string | undefined>(() => getTranslationOverride(identity));
  const [editing, setEditing] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const pending = React.useRef<{ identity: WordIdentity; draft: string; base: string } | null>(null);

  // [FB-42] The field is ALWAYS shown. Edited value wins (any language). Blank override: the default (Vietnamese)
  // translation only on a Vietnamese device; otherwise blank, with a placeholder to tap and add one.
  const defaultShown = deviceIsVi ? translation ?? '' : '';
  const effective = override ?? defaultShown;
  const textLang = override !== undefined ? guessLang(override) : defaultShown ? 'vi' : undefined;

  React.useEffect(() => {
    setOverride(getTranslationOverride(identity));
    const refresh = () => setOverride(getTranslationOverride(identity));
    window.addEventListener(TRANSLATION_OVERRIDE_EVENT, refresh);
    return () => window.removeEventListener(TRANSLATION_OVERRIDE_EVENT, refresh);
  }, [identity]);

  // Auto-advance can swap the card mid-edit: keep what the user typed instead of dropping it.
  React.useEffect(() => {
    return () => {
      const p = pending.current;
      if (p && p.draft.trim() !== p.base.trim()) setTranslationOverride(p.identity, p.draft);
      if (p) emitTranslationEdit('cancel');
      pending.current = null;
      setEditing(false);
      setSaved(false);
    };
  }, [idKey]);

  React.useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), SAVED_CONFIRM_MS + 400);
    return () => clearTimeout(t);
  }, [saved]);

  const start = () => {
    const base = effective;
    setDraft(base);
    pending.current = { identity, draft: base, base };
    setSaved(false);
    setEditing(true);
    emitTranslationEdit('start');
  };
  const onChange = (v: string) => {
    setDraft(v);
    if (pending.current) pending.current.draft = v;
  };
  const save = () => {
    setTranslationOverride(identity, draft);
    pending.current = null;
    setEditing(false);
    setSaved(true);
    emitTranslationEdit('save');
  };
  const cancel = () => {
    pending.current = null;
    setEditing(false);
    emitTranslationEdit('cancel');
  };
  const reset = () => {
    setTranslationOverride(identity, '');
    pending.current = null;
    setEditing(false);
    setSaved(true);
    emitTranslationEdit('save');
  };

  const textStyle: React.CSSProperties = { fontStyle: 'italic', fontSize: '0.9em', textAlign: 'left', whiteSpace: 'pre-line', color };

  if (editing) {
    return (
      <div className="lv-translation lv-translation-edit space-y-1">
        <textarea
          data-testid="translation-editor"
          className="w-full rounded-md border theme-border bg-transparent p-2 text-sm"
          style={{ whiteSpace: 'pre-wrap', color }}
          rows={4}
          dir="auto"
          maxLength={MAX_TRANSLATION_CHARS}
          value={draft}
          autoFocus
          aria-label={isVi ? 'Sửa bản dịch' : 'Edit translation'}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={save} data-testid="translation-save">{isVi ? 'Lưu' : 'Save'}</Button>
          <Button size="sm" variant="outline" onClick={cancel}>{isVi ? 'Hủy' : 'Cancel'}</Button>
          {override !== undefined && (
            <Button size="sm" variant="ghost" onClick={reset}>{isVi ? 'Dùng bản gốc' : 'Use original'}</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="lv-translation flex items-start gap-1" style={textStyle}>
      <em className="min-w-0 flex-1" data-testid="translation-text" dir="auto" lang={textLang} data-empty={effective ? undefined : 'true'} style={effective ? undefined : { opacity: 0.6 }}>
        * {effective || (isVi ? 'Thêm bản dịch' : 'Add translation')}
      </em>
      {saved && (
        <span role="status" data-testid="translation-saved" className="shrink-0 self-center text-xs font-medium not-italic" style={{ color: 'var(--lv-accent)' }}>
          {isVi ? 'Đã lưu' : 'Saved'}
        </span>
      )}
      {editable && (canEdit ? (
        <button type="button" className="shrink-0 p-1 opacity-70 hover:opacity-100" aria-label={isVi ? 'Sửa bản dịch' : 'Edit translation'} data-testid="translation-edit" onClick={start}>
          <Pencil size={14} aria-hidden="true" />
        </button>
      ) : (
        <button type="button" className="shrink-0 p-1 opacity-70 hover:opacity-100" aria-label="Edit translation (Pro)" data-testid="translation-edit-locked" onClick={() => openProUpgrade('editTranslation')}>
          <Lock size={14} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
};

export default EditableTranslation;
