import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { fetchContacts, addContact, editContact, deleteContact, unifyPhoneNo, parseContactName } from '../api';
import type { Contact, OdorikCredentials } from '../api';
import ContactModal from './ContactModal';
import { SkeletonList } from './Skeleton';
import { useT } from '../i18n';

const countryFlags: Record<string, string> = {
	'+1': '🇺🇸', '+1-242': '🇧🇸', '+1-246': '🇧🇲', '+1-264': '🇦🇬', '+1-268': '🇦🇬', '+1-284': '🇻🇬', '+1-340': '🇻🇮', '+1-345': '🇰🇾', '+1-347': '🇺🇸', '+1-464': '🇲🇸', '+1-473': '🇬🇩', '+1-539': '🇺🇸', '+1-551': '🇺🇸', '+1-558': '🇺🇸', '+1-571': '🇺🇸', '+1-609': '🇧🇲', '+1-626': '🇺🇸', '+1-628': '🇺🇸', '+1-649': '🇹🇨', '+1-658': '🇯🇲', '+1-664': '🇲🇽', '+1-670': '🇲🇵', '+1-671': '🇬🇺', '+1-684': '🇦🇸', '+1-721': '🇸🇩', '+1-758': '🇱🇨', '+1-767': '🇩🇲', '+1-784': '🇻🇬', '+1-787': '🇵🇷', '+1-868': '🇹🇹', '+1-869': '🇰🇳', '+1-876': '🇯🇲', '+1-939': '🇵🇷',
	'+7': '🇷🇺',
	'+20': '🇪🇬',
	'+27': '🇿🇦',
	'+30': '🇬🇷',
	'+31': '🇳🇱',
	'+32': '🇧🇪',
	'+33': '🇫🇷',
	'+34': '🇪🇸',
	'+36': '🇭🇺',
	'+37': '🇱🇹',
	'+38': '🇲🇪',
	'+40': '🇷🇴',
	'+41': '🇨🇭',
	'+43': '🇦🇹',
	'+44': '🇬🇧',
	'+45': '🇩🇰',
	'+46': '🇸🇪',
	'+47': '🇳🇴',
	'+48': '🇵🇱',
	'+49': '🇩🇪',
	'+51': '🇵🇪',
	'+52': '🇲🇽',
	'+53': '🇨🇺',
	'+54': '🇦🇷',
	'+55': '🇧🇷',
	'+56': '🇨🇱',
	'+57': '🇨🇴',
	'+58': '🇻🇪',
	'+60': '🇲🇾',
	'+61': '🇦🇺',
	'+62': '🇮🇩',
	'+63': '🇵🇭',
	'+64': '🇳🇿',
	'+65': '🇸🇬',
	'+66': '🇹🇭',
	'+81': '🇯🇵',
	'+82': '🇰🇷',
	'+84': '🇻🇳',
	'+86': '🇨🇳',
	'+90': '🇹🇷',
	'+91': '🇮🇳',
	'+92': '🇵🇰',
	'+93': '🇦🇫',
	'+94': '🇱🇰',
	'+95': '🇲🇲',
	'+218': '🇱🇾',
	'+220': '🇬🇲',
	'+221': '🇸🇳',
	'+222': '🇲🇷',
	'+223': '🇲🇱',
	'+224': '🇬🇳',
	'+225': '🇨🇮',
	'+226': '🇧🇫',
	'+227': '🇳🇪',
	'+228': '🇹🇬',
	'+229': '🇧🇯',
	'+230': '🇲🇺',
	'+231': '🇱🇷',
	'+232': '🇸🇱',
	'+233': '🇬🇭',
	'+234': '🇳🇬',
	'+235': '🇹🇩',
	'+236': '🇨🇲',
	'+237': '🇨🇬',
	'+238': '🇨🇻',
	'+239': '🇸🇹',
	'+240': '🇬🇶',
	'+241': '🇬🇦',
	'+242': '🇨🇩',
	'+243': '🇨🇿',
	'+244': '🇦🇴',
	'+245': '🇬🇼',
	'+246': '🇮🇴',
	'+248': '🇸🇨',
	'+249': '🇸🇩',
	'+250': '🇷🇼',
	'+251': '🇪🇹',
	'+252': '🇸🇴',
	'+253': '🇩🇯',
	'+254': '🇰🇪',
	'+255': '🇹🇿',
	'+256': '🇺🇬',
	'+257': '🇧🇮',
	'+258': '🇲🇿',
	'+260': '🇿🇲',
	'+261': '🇲🇬',
	'+262': '🇷🇪',
	'+263': '🇿🇼',
	'+264': '🇳🇦',
	'+265': '🇲🇼',
	'+266': '🇱🇸',
	'+267': '🇧🇼',
	'+268': '🇸🇿',
	'+269': '🇰🇲',
	'+290': '🇹🇱',
	'+291': '🇪🇷',
	'+297': '🇨🇼',
	'+298': '🇫🇴',
	'+299': '🇬🇰',
	'+350': '🇬🇮',
	'+351': '🇵🇹',
	'+352': '🇱🇺',
	'+353': '🇮🇪',
	'+354': '🇮🇸',
	'+355': '🇦🇱',
	'+356': '🇲🇹',
	'+357': '🇨🇾',
	'+358': '🇫🇮',
	'+359': '🇧🇬',
	'+370': '🇱🇹',
	'+371': '🇱🇻',
	'+372': '🇪🇪',
	'+373': '🇲🇩',
	'+374': '🇦🇲',
	'+375': '🇧🇾',
	'+376': '🇦🇩',
	'+377': '🇲🇨',
	'+378': '🇸🇲',
	'+379': '🇺🇦',
	'+380': '🇺🇦',
	'+381': '🇷🇸',
	'+382': '🇲🇪',
	'+383': '🇽🇰',
	'+385': '🇭🇷',
	'+386': '🇸🇮',
	'+387': '🇧🇦',
	'+389': '🇲🇰',
	'+420': '🇨🇿',
	'+421': '🇸🇰',
	'+423': '🇱🇮',
	'+424': '🇻🇪',
	'+425': '🇹🇲',
	'+426': '🇸🇰',
	'+427': '🇺🇬',
	'+428': '🇲🇳',
	'+429': '🇲🇽',
	'+500': '🇫🇰',
	'+501': '🇧🇿',
	'+502': '🇬🇹',
	'+503': '🇸🇻',
	'+504': '🇭🇳',
	'+505': '🇳🇮',
	'+506': '🇨🇷',
	'+507': '🇵🇦',
	'+508': '🇵🇲',
	'+509': '🇭🇹',
	'+590': '🇬🇵',
	'+591': '🇧🇴',
	'+592': '🇬🇾',
	'+593': '🇪🇨',
	'+594': '🇬🇫',
	'+595': '🇵🇾',
	'+596': '🇲🇶',
	'+597': '🇸🇷',
	'+598': '🇺🇾',
	'+599': '🇨🇼',
	'+670': '🇹🇱',
	'+672': '🇳🇫',
	'+673': '🇧🇳',
	'+674': '🇳🇷',
	'+675': '🇵🇬',
	'+676': '🇹🇴',
	'+677': '🇸🇧🇲',
	'+678': '🇻🇺',
	'+679': '🇫🇯',
	'+680': '🇵🇼',
	'+681': '🇼🇫',
	'+682': '🇨🇰',
	'+683': '🇳🇪',
	'+685': '🇻🇺',
	'+686': '🇰🇮',
	'+687': '🇳🇧',
	'+688': '🇹🇻',
	'+689': '🇵🇫',
	'+690': '🇹🇰',
	'+691': '🇲🇵',
	'+692': '🇲🇭',
	'+800': '🇨🇭',
	'+808': '🇺🇸',
	'+850': '🇰🇵',
	'+852': '🇭🇰',
	'+853': '🇲🇴',
	'+854': '🇰🇵',
	'+855': '🇰🇭',
	'+856': '🇱🇦',
	'+870': '🇵🇸',
	'+878': '🇺🇸',
	'+880': '🇧🇩',
	'+881': '🇫🇷',
	'+882': '🇪🇺',
	'+883': '🇪🇺',
	'+886': '🇹🇼',
	'+888': '🇪🇹',
	'+960': '🇲🇻',
	'+961': '🇱🇧',
	'+962': '🇯🇴',
	'+963': '🇸🇾',
	'+964': '🇮🇶',
	'+965': '🇰🇼',
	'+966': '🇸🇦',
	'+967': '🇾🇪',
	'+968': '🇴🇲',
	'+970': '🇵🇸',
	'+971': '🇦🇪',
	'+972': '🇮🇱',
	'+973': '🇧🇭',
	'+974': '🇶🇦',
	'+975': '🇧🇹',
	'+976': '🇲🇳',
	'+977': '🇳🇵',
	'+978': '🇮🇶',
	'+979': '🇮🇶',
	'+992': '🇹🇯',
	'+993': '🇹🇲',
	'+994': '🇦🇿',
	'+995': '🇬🇪',
	'+996': '🇰🇬',
	'+998': '🇺🇿',
};

const getCountryFlag = (phone: string): string => {
	const clean = phone.replace(/\D/g, '');
	const digits = clean.startsWith('00') ? clean.slice(2) : (clean.startsWith('0') ? clean.slice(1) : clean);
	if (digits.startsWith('420') && digits.length >= 9) return countryFlags['+420'] || '🇨🇿';
	if (digits.startsWith('421') && digits.length >= 9) return countryFlags['+421'] || '🇸🇰';
	if (digits.startsWith('1') && digits.length >= 10) {
		const cc = '+' + digits.slice(0, 2);
		return countryFlags[cc] || countryFlags['+1'] || '🇺🇸';
	}
	for (const prefix of Object.keys(countryFlags).sort((a, b) => b.length - a.length)) {
		if (digits.startsWith(prefix.replace('+', ''))) return countryFlags[prefix];
	}
	return '🌍';
};

export default function Contacts({ creds, setTab }: { creds: OdorikCredentials; setTab?: (tab: 'contacts' | 'activity' | 'callback' | 'send_sms' | 'lines' | 'statistics' | 'settings') => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const t = useT();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Action Sheet State
  const [activeActionSheet, setActiveActionSheet] = useState<Contact | null>(null);

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.number.includes(q) ||
      c.shortcut.toString().includes(q)
    );
  }, [contacts, search]);

  useEffect(() => {
    load();
  }, [creds]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchContacts(creds);
      setContacts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('contacts.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContact = async (data: Partial<Contact> & { oldShortcut?: number }) => {
    if (data.oldShortcut) {
      await editContact(creds, data.oldShortcut, data as Contact);
    } else {
      await addContact(creds, data);
    }
    await load();
  };

  const handleDelete = async (shortcut: number) => {
    if (window.confirm(t('contacts.confirmDelete'))) {
      try {
        await deleteContact(creds, shortcut);
        await load();
      } catch (err) {
        alert(err instanceof Error ? err.message : t('contacts.deleteError'));
      }
    }
    setActiveActionSheet(null);
  };

  if (loading) {
    return (
      <div className="mb-4">
        <h2 className="text-[34px] leading-tight font-bold tracking-tight mb-4" style={{ color: 'var(--text-primary)' }}>{t('contacts.title')}</h2>
        <div className="ios-group p-4">
          <SkeletonList count={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-5 rounded-[26px] mt-4">
        <h3 className="font-bold mb-2 text-lg">{t('contacts.errorTitle')}</h3>
        <p className="text-sm opacity-90">{error}</p>
        <button onClick={load} className="mt-4 px-5 py-2.5 ios-capsule text-sm font-semibold active:scale-95 transition-transform">{t('common.retry')}</button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-[34px] leading-tight font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('contacts.title')}</h2>
        <button 
          onClick={() => { setEditingContact(null); setIsModalOpen(true); }}
          className="w-11 h-11 flex items-center justify-center rounded-full hover:opacity-90 active:scale-95 transition-all"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          aria-label={t('contacts.add')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
        </button>
      </div>

      {contacts.length > 0 && (
        <div className="mb-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('contacts.search')}
            className="ios-search"
          />
        </div>
      )}

      <div className="ios-group ios-rows" style={{ '--row-inset': '80px' } as React.CSSProperties}>
        {filteredContacts.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
            {search ? t('contacts.no_results') : t('contacts.empty')}
          </div>
        ) : filteredContacts.map((c) => {
          const parsed = parseContactName(c.name);
          return (
            <div 
              key={c.shortcut} 
              onClick={() => setActiveActionSheet(c)}
              className="p-4 flex items-center justify-between transition-colors cursor-pointer group ios-pressable"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--accent)' }}>
                  {getCountryFlag(c.number)}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-[17px] tracking-tight group-active:opacity-70 transition-opacity" style={{ color: 'var(--text-primary)' }}>
                    {parsed.name} {parsed.surname && <span className="font-bold">{parsed.surname}</span>}
                  </span>
                  <span className="text-[15px] font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>{unifyPhoneNo(c.number)}</span>
                  {parsed.note && <span className="text-[13px] mt-1 line-clamp-1" style={{ color: 'var(--text-tertiary)' }}>{parsed.note}</span>}
                </div>
              </div>
              
              <div className="min-w-9 h-7 px-2.5 rounded-full flex items-center justify-center text-sm font-semibold tabular-nums" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                {c.shortcut}
              </div>
            </div>
          );
        })}
      </div>

{/* Action Sheet via portal */}
      {activeActionSheet && createPortal(
        <div className="fixed inset-0 z-[9999]" style={{ height: '100vh', width: '100vw' }}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setActiveActionSheet(null)} />
          <div className="absolute left-2 right-2 bottom-[max(env(safe-area-inset-bottom),8px)] md:left-1/2 md:right-auto md:w-[420px] md:-translate-x-1/2 liquid-glass rounded-[34px] p-3 pt-5 max-h-[85vh] overflow-y-auto">
            <div className="text-center mb-4 px-4">
              <h3 className="font-bold text-xl truncate" style={{ color: 'var(--text-primary)' }}>{parseContactName(activeActionSheet.name).name}</h3>
              <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{unifyPhoneNo(activeActionSheet.number)}</p>
            </div>
            <div className="ios-group mb-3">
              <button onClick={() => { localStorage.setItem('callback_recipient', activeActionSheet.number); if (setTab) setTab('callback'); setActiveActionSheet(null); }} className="w-full flex items-center gap-4 px-4 py-4 text-left" style={{ backgroundColor: 'var(--surface)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: 'rgba(249, 115, 22, 1)' }}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                </div>
                <div className="flex-1 text-center"><div className="font-bold" style={{ color: 'var(--text-primary)' }}>{t('contacts.callback')}</div><div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('contacts.callbackDesc')}</div></div>
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-tertiary)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
              <div className="h-[0.5px] ml-4" style={{ backgroundColor: 'var(--separator)' }} />
              <button onClick={() => { localStorage.setItem('sms_recipient', activeActionSheet.number); if (setTab) setTab('send_sms'); setActiveActionSheet(null); }} className="w-full flex items-center gap-4 px-4 py-4 text-left" style={{ backgroundColor: 'var(--surface)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)' }}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                </div>
                <div className="flex-1 text-center"><div className="font-bold" style={{ color: 'var(--text-primary)' }}>{t('contacts.sendSms')}</div><div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('contacts.sendSmsDesc')}</div></div>
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-tertiary)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
              <div className="h-[0.5px] ml-4" style={{ backgroundColor: 'var(--separator)' }} />
              <a href={`tel:${unifyPhoneNo(activeActionSheet.number)}`} className="block w-full text-center py-3.5 font-medium text-[17px]" style={{ color: 'var(--accent)' }}>{t('contacts.call')}</a>
              <div className="h-[0.5px] ml-4" style={{ backgroundColor: 'var(--separator)' }} />
              <a href={`sms:${unifyPhoneNo(activeActionSheet.number)}`} className="block w-full text-center py-3.5 font-medium text-[17px]" style={{ color: 'var(--accent)' }}>{t('contacts.message')}</a>
              <div className="h-[0.5px] ml-4" style={{ backgroundColor: 'var(--separator)' }} />
              <button onClick={() => { setEditingContact(activeActionSheet); setIsModalOpen(true); setActiveActionSheet(null); }} className="block w-full text-center py-3.5 font-medium text-[17px]" style={{ color: 'var(--text-primary)' }}>{t('contacts.edit')}</button>
              <div className="h-[0.5px] ml-4" style={{ backgroundColor: 'var(--separator)' }} />
              <button onClick={() => handleDelete(activeActionSheet.shortcut)} className="block w-full text-center py-3.5 font-medium text-[17px]" style={{ color: 'var(--destructive)' }}>{t('contacts.delete')}</button>
            </div>
            <button onClick={() => setActiveActionSheet(null)} className="w-full py-3.5 font-semibold text-[17px] rounded-full" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}>{t('common.cancel')}</button>
          </div>
        </div>,
        document.body
      )}

      {/* Modals via portal */}
      {createPortal(
        <ContactModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSaveContact} 
          initialData={editingContact} 
        />,
        document.body
      )}
    </>
  );
}
