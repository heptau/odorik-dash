import { useState, useEffect, useMemo } from 'react';
import { fetchSMS, unifyPhoneNo, loadFromCache, saveToCache, getCacheKey, lookupContact, parseContactName } from '../api';
import type { OdorikSMS, OdorikCredentials, Contact } from '../api';
import { SkeletonList } from './Skeleton';
import { useT } from '../i18n';

export default function Sms({ creds, setTab, contacts = [] }: { creds: OdorikCredentials; setTab?: (tab: 'contacts' | 'calls' | 'sms' | 'callback' | 'send_sms') => void; contacts?: Contact[] }) {
  const [sms, setSms] = useState<OdorikSMS[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const t = useT();

  const cacheKey = getCacheKey(creds, 'sms');

  const filteredSms = useMemo(() => {
    if (!search.trim()) return sms;
    const q = search.toLowerCase();
    return sms.filter(s => {
      const contact = lookupContact(s.source_number, contacts);
      return (
        s.source_number.includes(q) ||
        s.destination_number.includes(q) ||
        (contact && contact.name.toLowerCase().includes(q))
      );
    });
  }, [sms, contacts, search]);

  useEffect(() => {
    const loadCache = async () => {
      const cachedData = await loadFromCache<OdorikSMS>(cacheKey);
      if (cachedData.length > 0) {
        setSms(cachedData);
        syncNewData(cachedData);
      } else {
        loadInitial();
      }
    };
    loadCache();
  }, [creds]);

  const syncNewData = async (existingSms: OdorikSMS[]) => {
    setIsRefreshing(true);
    try {
      const latestSms = existingSms.reduce((max, s) => 
        new Date(s.date) > new Date(max.date) ? s : max, existingSms[0]);
      
      const fromDate = new Date(latestSms.date);
      fromDate.setSeconds(fromDate.getSeconds() + 1);
      const toDate = new Date();

      if (fromDate >= toDate) return;

      const newData = await fetchSMS(creds, fromDate.toISOString(), toDate.toISOString());
      if (newData.length > 0) {
        const merged = [...newData, ...existingSms];
        const unique = Array.from(new Map(merged.map(s => [s.id, s])).values());
        const sorted = unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setSms(sorted);
        saveToCache(cacheKey, sorted);
      }
    } catch (err) {
      console.error('Failed to sync new SMS', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadInitial = async () => {
    setLoading(true);
    try {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const fromDate = d.toISOString();
      const toDate = new Date().toISOString();

      const data = await fetchSMS(creds, fromDate, toDate);
      const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSms(sorted);
      saveToCache(cacheKey, sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loading || isRefreshing || sms.length === 0) return;
    setLoading(true);
    try {
      const oldestSms = sms[sms.length - 1];
      const toDate = new Date(oldestSms.date);
      toDate.setSeconds(toDate.getSeconds() - 1);
      
      const fromDate = new Date(toDate);
      fromDate.setDate(fromDate.getDate() - 60);

      const moreData = await fetchSMS(creds, fromDate.toISOString(), toDate.toISOString());
      if (moreData.length > 0) {
        const merged = [...sms, ...moreData];
        const unique = Array.from(new Map(merged.map(s => [s.id, s])).values());
        const sorted = unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setSms(sorted);
        saveToCache(cacheKey, sorted);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('sms.error_loading');
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('sms.received_title')}</h2>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px', borderStyle: 'solid' }}>
          <SkeletonList count={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-5 rounded-2xl border border-red-100 shadow-sm mt-4">
        <h3 className="font-bold mb-2 text-lg">{t('common.error')}</h3>
        <p className="text-sm opacity-90">{error}</p>
        <button onClick={loadInitial} className="mt-4 px-5 py-2.5 rounded-xl shadow-sm text-sm font-semibold transition-transform" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px', borderStyle: 'solid', color: 'var(--text-primary)' }}>{t('common.retry')}</button>
      </div>
    );
  }

return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
          {t('sms.received_title')}
          {isRefreshing && (
            <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          )}
        </h2>
        <div className="text-sm font-medium bg-white px-3 py-1.5 rounded-lg border w-fit" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', color: 'var(--text-secondary)' }}>
          {search ? `${filteredSms.length} / ` : ''}{sms.length} {t('sms.messages')}
        </div>
      </div>

      {sms.length > 0 && (
        <div className="mb-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('sms.search')}
            className="w-full px-4 py-2.5 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', color: 'var(--text-primary)' }}
          />
        </div>
      )}

      <div className="rounded-2xl shadow-sm divide-y overflow-hidden mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px', borderStyle: 'solid' }}>
        {filteredSms.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
            {search ? t('sms.no_results') : t('sms.empty_received')}
          </div>
        ) : filteredSms.map((s) => {
          return (
            <div key={s.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors" style={{ backgroundColor: 'var(--surface)', borderBottomColor: 'var(--separator)', borderBottomWidth: '1px', borderBottomStyle: 'solid' }}>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--accent)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                </div>
                {(() => {
                  // For SMS, source = sender, destination = receiver
                  // Try to match both numbers against contacts and show the most relevant one
                  const srcContact = lookupContact(s.source_number, contacts);
                  const dstContact = lookupContact(s.destination_number, contacts);
                  const srcParsed = srcContact ? parseContactName(srcContact.name) : null;
                  const dstParsed = dstContact ? parseContactName(dstContact.name) : null;

                  const renderParty = (label: string, rawPhone: string, parsed: ReturnType<typeof parseContactName> | null) => (
                    <span className="inline-flex flex-col min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-wide leading-none mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                      {parsed ? (
                        <>
                          <span className="font-semibold text-[15px] truncate leading-tight" style={{ color: 'var(--text-primary)' }}>{parsed.displayName}</span>
                          <span className="text-[11px] leading-tight" style={{ color: 'var(--text-tertiary)' }}>{unifyPhoneNo(rawPhone)}</span>
                        </>
                      ) : (
                        <span className="font-semibold text-[15px] truncate" style={{ color: 'var(--text-primary)' }}>{unifyPhoneNo(rawPhone)}</span>
                      )}
                    </span>
                  );

                  return (
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-start gap-2">
                        {renderParty('Od', s.source_number, srcParsed)}
                        <span className="text-gray-300 mt-3 shrink-0" style={{ color: 'var(--text-tertiary)' }}>→</span>
                        {renderParty('Na', s.destination_number, dstParsed)}
                      </div>
                      <span className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(s.date).toLocaleString('cs-CZ')}
                      </span>
                    </div>
                  );
                })()}
              </div>
              
              <div className="flex items-center justify-between md:justify-end gap-6 ml-[52px] md:ml-0 pt-3 md:pt-0 mt-1 md:mt-0 w-full md:w-auto" style={{ borderTopColor: 'var(--separator)', borderTopWidth: '1px', borderTopStyle: 'solid' }}>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col text-left md:text-right invisible md:visible shrink-0">
                    <span className="text-[13px] uppercase tracking-wide font-medium" style={{ color: 'var(--text-secondary)' }}>Cena</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{s.price} Kč</span>
                  </div>
                  <button 
                    onClick={() => {
                      localStorage.setItem('sms_recipient', s.source_number);
                      if (setTab) setTab('send_sms');
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--accent)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                    {t('contacts.reply')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sms.length > 0 && (
        <button 
          onClick={loadMore} 
          disabled={loading || isRefreshing}
          className="w-full py-4 border rounded-2xl font-semibold transition-all disabled:opacity-50 mb-10"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', color: 'var(--text-secondary)' }}
        >
          {loading ? t('common.loading') : t('sms.load_more')}
        </button>
      )}
    </>
  );
}
