import { useState, useEffect } from 'react';
import type { Contact } from '../api';
import { parseContactName, buildContactName } from '../api';
import { useT } from '../i18n';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: Partial<Contact> & { oldShortcut?: number }) => Promise<void>;
  initialData?: Contact | null;
}

export default function ContactModal({ isOpen, onClose, onSave, initialData }: ContactModalProps) {
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [note, setNote] = useState('');
  const [number, setNumber] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useT();

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const parsed = parseContactName(initialData.name);

        setName(parsed.name);
        setSurname(parsed.surname);
        setNote(parsed.note);
        setNumber(initialData.number);
        setShortcut(initialData.shortcut.toString());
      } else {
        setName('');
        setSurname('');
        setNote('');
        setNumber('');
        setShortcut('');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const fullname = buildContactName(name, surname, note);

    try {
      await onSave({
        name: fullname,
        number,
        shortcut: shortcut ? parseInt(shortcut) : undefined,
        oldShortcut: initialData?.shortcut
      });
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('contacts.deleteError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity" onClick={onClose} />
      <div className="fixed inset-x-2 bottom-[max(env(safe-area-inset-bottom),8px)] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 rounded-[34px] shadow-xl z-[60] p-6 pt-3 md:pt-6 md:max-w-md md:w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--surface)' }}>
        
        {/* Mobile handle */}
        <div className="w-9 h-[5px] rounded-full mx-auto mb-4 md:hidden" style={{ backgroundColor: 'var(--fill)' }} />
        
        <h2 className="text-xl font-bold mb-4 text-center md:text-left" style={{ color: 'var(--text-primary)' }}>{initialData ? t('contacts.edit') : t('contacts.new')}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{t('contacts.name')}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" style={{ backgroundColor: 'var(--fill)', color: 'var(--text-primary)' }} placeholder="Jan" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{t('contacts.surname')}</label>
            <input type="text" value={surname} onChange={e => setSurname(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" style={{ backgroundColor: 'var(--fill)', color: 'var(--text-primary)' }} placeholder="Novák" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{t('contacts.phone')}</label>
            <input type="tel" value={number} onChange={e => setNumber(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" style={{ backgroundColor: 'var(--fill)', color: 'var(--text-primary)' }} placeholder="+420..." required />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{t('contacts.shortcut')}</label>
              <input type="number" min="1" max="999" value={shortcut} onChange={e => setShortcut(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono" style={{ backgroundColor: 'var(--fill)', color: 'var(--text-primary)' }} placeholder="Auto" />
            </div>
            <div className="flex-[2]">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{t('contacts.note')}</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" style={{ backgroundColor: 'var(--fill)', color: 'var(--text-primary)' }} placeholder="Rodina" />
            </div>
          </div>
          
          <div className="flex items-center gap-3 mt-6">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 font-semibold rounded-full transition-colors ios-capsule">{t('common.cancel')}</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 text-white font-semibold rounded-full transition-colors disabled:opacity-50" style={{ backgroundColor: 'var(--accent)' }}>
              {isSubmitting ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
