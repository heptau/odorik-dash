import { useState, useEffect } from 'react';
import { sendSMS } from '../api';
import type { OdorikCredentials } from '../api';
import { useT } from '../i18n';

const removeAccents = (text: string) => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Simplified estimation: 
// 160 for 1st SMS, 153 for subsequent if GSM 7-bit (no accents)
// 70 for 1st SMS, 67 for subsequent if UCS-2 (accents)
// But we always try to normalize to GSM by default.
const getSmsStats = (text: string) => {
  const isGsm = text === removeAccents(text);
  const len = text.length;
  if (isGsm) {
    const parts = len <= 160 ? 1 : Math.ceil(len / 153);
    const remaining = parts === 1 ? 160 - len : (parts * 153) - len;
    return { parts, len, remaining, isGsm };
  } else {
    const parts = len <= 70 ? 1 : Math.ceil(len / 67);
    const remaining = parts === 1 ? 70 - len : (parts * 67) - len;
    return { parts, len, remaining, isGsm };
  }
};

export default function SendSms({ creds }: { creds: OdorikCredentials }) {
  const [recipient, setRecipient] = useState(() => localStorage.getItem('sms_recipient') || '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const t = useT();

  const stats = getSmsStats(message);

  useEffect(() => {
    localStorage.removeItem('sms_recipient');
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!recipient || !message) {
        throw new Error(t('send_sms.error_empty'));
      }

      await sendSMS(creds, recipient, message);
      setSuccess(t('send_sms.success'));
      setMessage('');
      setRecipient('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('send_sms.error'));
    } finally {
      setLoading(false);
    }
  };

  const optimize = () => {
    setMessage(removeAccents(message));
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 font-display" style={{ color: 'var(--text-primary)' }}>{t('send_sms.title')}</h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 mb-6 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-2xl border border-green-100 mb-6 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}

      <form onSubmit={handleSend} className="space-y-6">
        <div className="p-6 rounded-3xl shadow-sm space-y-5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px', borderStyle: 'solid' }}>
          <div>
            <label className="block text-sm font-semibold mb-1.5 ml-1" style={{ color: 'var(--text-primary)' }}>{t('send_sms.recipient')}</label>
            <input
              type="tel"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="+420..."
              className="w-full px-4 py-3.5 border rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--separator)', color: 'var(--text-primary)' }}
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5 ml-1">
              <label className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('send_sms.message')}</label>
              {!stats.isGsm && (
                <button 
                  type="button"
                  onClick={optimize}
                  className="text-xs font-bold flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  {t('send_sms.optimize')}
                </button>
              )}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('send_sms.placeholder')}
              rows={5}
              className="w-full px-4 py-3.5 border rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--separator)', color: 'var(--text-primary)' }}
              required
            />
            
            <div className="mt-3 flex justify-between items-center px-1">
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-black tracking-widest" style={{ color: 'var(--text-tertiary)' }}>{t('send_sms.length')}</span>
                  <span className={`text-sm font-bold ${stats.len > (stats.isGsm ? 160 : 70) ? 'text-orange-600' : ''}`} style={{ color: stats.len > (stats.isGsm ? 160 : 70) ? 'var(--warning)' : 'var(--text-primary)' }}>{stats.len}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-black tracking-widest" style={{ color: 'var(--text-tertiary)' }}>{t('send_sms.parts')}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{stats.parts}</span>
                </div>
                {!stats.isGsm && (
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-black tracking-widest" style={{ color: 'var(--destructive)' }}>{t('send_sms.mode')}</span>
                    <span className="text-sm font-bold" style={{ color: 'var(--destructive)' }}>UCS-2</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-black tracking-widest block" style={{ color: 'var(--text-tertiary)' }}>{t('send_sms.remaining')}</span>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{stats.remaining}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !message || !recipient}
          className="w-full py-4 px-6 text-white font-bold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
          style={{ backgroundColor: 'var(--accent)', boxShadow: '0 4px 12px var(--shadow)' }}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{t('send_sms.sending')}</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              <span>{t('send_sms.send')}</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 p-6 rounded-3xl" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--separator)', borderWidth: '1px', borderStyle: 'solid' }}>
        <h3 className="text-sm font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>{t('send_sms.tip_title')}</h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {t('send_sms.tip_text')}
        </p>
      </div>
    </div>
  );
}
