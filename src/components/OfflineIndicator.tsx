import { useState, useEffect } from 'react';
import { useT } from '../i18n';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const t = useT();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium text-white bg-amber-600">
        {t('common.offline')}
      </div>
    );
  }

  return null;
}