import { useState, useEffect } from 'react';
import { fetchLines, orderCallback } from '../api';
import type { OdorikLine, OdorikCredentials } from '../api';
import { useT } from '../i18n';

export default function Callback({ creds }: { creds: OdorikCredentials }) {
  const [recipient, setRecipient] = useState(() => localStorage.getItem('callback_recipient') || '');
  const [caller, setCaller] = useState(() => localStorage.getItem('callback_caller') || '');
  const [selectedLine, setSelectedLine] = useState(() => localStorage.getItem('callback_line') || 'none');
  const [lines, setLines] = useState<OdorikLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const t = useT();

  // Clear the recipient from storage after we've loaded it to avoid it sticking around forever
  useEffect(() => {
    localStorage.removeItem('callback_recipient');
  }, []);

  useEffect(() => {
    const loadLines = async () => {
      try {
        const data = await fetchLines(creds);
        setLines(data);
      } catch (err) {
        console.error('Failed to load lines', err);
      }
    };
    loadLines();
  }, [creds]);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!recipient || !caller) {
        throw new Error(t('callback.error_empty'));
      }

      await orderCallback(creds, recipient, caller, selectedLine);
      setSuccess(t('callback.success'));
      
      localStorage.setItem('callback_caller', caller);
      localStorage.setItem('callback_line', selectedLine);
      
      setRecipient('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('callback.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>{t('callback.title')}</h2>

      {error && (
        <div className="text-red-600 p-4 rounded-2xl mb-6 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--separator)', borderWidth: '1px' }}>
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {success && (
        <div className="text-green-700 p-4 rounded-2xl mb-6 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'var(--separator)', borderWidth: '1px' }}>
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}

      <form onSubmit={handleOrder} className="space-y-6">
        <div className="p-6 rounded-3xl shadow-sm space-y-5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px' }}>
          <div>
            <label className="block text-sm font-semibold mb-1.5 ml-1" style={{ color: 'var(--text-primary)' }}>{t('callback.your_number')}</label>
            <input
              type="tel"
              value={caller}
              onChange={(e) => setCaller(e.target.value)}
              placeholder="+420..."
              className="w-full px-4 py-3.5 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--separator)', color: 'var(--text-primary)' }}
              required
            />
            <p className="mt-1.5 text-xs ml-1 italic" style={{ color: 'var(--text-tertiary)' }}>{t('callback.your_number_hint')}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5 ml-1" style={{ color: 'var(--text-primary)' }}>{t('callback.recipient')}</label>
            <input
              type="tel"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="+420..."
              className="w-full px-4 py-3.5 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--separator)', color: 'var(--text-primary)' }}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5 ml-1" style={{ color: 'var(--text-primary)' }}>{t('callback.line')}</label>
            <select
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--separator)', color: 'var(--text-primary)' }}
            >
              <option value="none">{t('callback.default_line')}</option>
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id}: {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 px-6 font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
          style={{ backgroundColor: 'var(--accent)', color: 'white', boxShadow: '0 4px 12px var(--shadow)' }}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{t('callback.ordering')}</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
              <span>{t('callback.order')}</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 p-6 rounded-3xl" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', borderColor: 'var(--separator)', borderWidth: '1px' }}>
        <h3 className="text-sm font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--accent)' }}>{t('callback.how_it_works')}</h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {t('callback.how_it_works_text')}
        </p>
      </div>
    </div>
  );
}
