import { useState } from 'react';
import type { OdorikCredentials } from '../api';
import { saveCredentials, fetchBalance } from '../api';
import { useT } from '../i18n';

export default function Login({ onLogin }: { onLogin: (creds: OdorikCredentials) => void }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const t = useT();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user && pass) {
      setLoading(true);
      setError('');
      
      const creds = { user, pass };
      await saveCredentials(creds);
      
      try {
        await fetchBalance(creds);
        onLogin(creds);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errors.unknown'));
        setLoading(false);
      }
    }
  };

  const containerStyle = {
    backgroundColor: 'var(--bg-secondary)',
  };
  
  const formStyle = {
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--separator)',
    boxShadow: '0 20px 40px var(--shadow-strong)',
  };
  
  const titleStyle = {
    color: 'var(--text-primary)',
  };
  
  const subtitleStyle = {
    color: 'var(--text-secondary)',
  };
  
  const labelStyle = {
    color: 'var(--text-primary)',
  };
  
  const inputStyle = {
    backgroundColor: 'var(--bg-tertiary)',
    borderColor: 'var(--separator)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="flex items-center justify-center h-full p-4" style={containerStyle}>
      <form onSubmit={submit} className="p-6 md:p-8 rounded-2xl border w-full max-w-sm" style={formStyle}>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight" style={titleStyle}>{t('login.title')}</h1>
          <p className="text-sm mt-2" style={subtitleStyle}>{t('login.subtitle')}</p>
          {error && (
            <p className="text-sm mt-2 text-red-600 font-medium" style={{ color: 'var(--destructive)' }}>{error}</p>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyle}>{t('login.username')}</label>
            <input 
              type="text" 
              value={user} 
              onChange={e => setUser(e.target.value)} 
              className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
              style={inputStyle}
              placeholder="123456" 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyle}>{t('login.password')}</label>
            <input 
              type="password" 
              value={pass} 
              onChange={e => setPass(e.target.value)} 
              className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
              style={inputStyle}
              placeholder="••••••••" 
              required
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full mt-6 py-3 rounded-xl transition-all font-medium disabled:opacity-50" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
          {loading ? t('common.loading') : t('login.submit')}
        </button>
      </form>
    </div>
  );
}