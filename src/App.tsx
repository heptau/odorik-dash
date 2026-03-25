import { useState, useEffect, lazy, Suspense } from 'react';
import Contacts from './components/Contacts';
import SendSms from './components/SendSms';
import Callback from './components/Callback';
import Lines from './components/Lines';
import Login from './components/Login';
import Settings from './components/Settings';
import ActiveCalls from './components/ActiveCalls';
import Activity from './components/Activity';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SkeletonList } from './components/Skeleton';
import { useBalance, useContacts, useActiveCalls, useActivity, useLines } from './hooks';
import { useT } from './i18n';

const Statistics = lazy(() => import('./components/Statistics').then(m => ({ default: m.default })));
import { loadCredentials, clearCredentials, clearAllCaches } from './api';
import type { OdorikCredentials } from './api';

function App() {
	const [creds, setCreds] = useState<OdorikCredentials | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<'contacts' | 'activity' | 'callback' | 'send_sms' | 'lines' | 'statistics' | 'settings'>('contacts');
	const t = useT();

	const { balance, loading: balanceLoading, refresh: refreshBalance } = useBalance(creds);
	const { contacts } = useContacts(creds);
	const { calls: activeCalls, loading: activeLoading, hasActive, hangup } = useActiveCalls(creds);
	const { lines } = useLines(creds);
	const { activity, loading: activityLoading, loadingMore, error: activityError, selectedType, setSelectedType, selectedLine, setSelectedLine, loadMore } = useActivity(creds);

	const handleClearCache = async () => {
		try {
			await clearAllCaches();
		} catch (e) {
			console.error('Clear cache error:', e);
		}
	};

	const handleLogout = async () => {
		try {
			console.log('Logging out, clearing caches...');
			await clearAllCaches();
			await clearCredentials();
			console.log('Logout complete, reloading...');
		} catch (e) {
			console.error('Logout error:', e);
		} finally {
			window.location.reload();
		}
	};

	useEffect(() => {
		(async () => {
			const saved = await loadCredentials();
			setCreds(saved);
			setLoading(false);
		})();
	}, []);

	if (loading) {
		return null;
	}

	if (!creds) {
		return <Login onLogin={setCreds} />;
	}

	const renderContent = () => (
		<ErrorBoundary>
			{hasActive && (
				<ActiveCalls calls={activeCalls} onHangup={hangup} loading={activeLoading} />
			)}
			{activeTab === 'contacts' && <Contacts creds={creds} setTab={setActiveTab} />}
			{activeTab === 'activity' && (
				<Activity
					activity={activity}
					loading={activityLoading}
					loadingMore={loadingMore}
					error={activityError}
					selectedType={selectedType}
					onTypeChange={setSelectedType}
					selectedLine={selectedLine}
					onLineChange={setSelectedLine}
					lines={lines}
					onLoadMore={loadMore}
					contacts={contacts}
				/>
			)}
			{activeTab === 'callback' && <Callback creds={creds} />}
			{activeTab === 'send_sms' && <SendSms creds={creds} />}
			{activeTab === 'lines' && <Lines creds={creds} />}
			{activeTab === 'statistics' && (
				<Suspense fallback={<div className="p-4"><SkeletonList count={5} /></div>}>
					<Statistics creds={creds} />
				</Suspense>
			)}
			{activeTab === 'settings' && <Settings onClearCache={handleClearCache} />}
		</ErrorBoundary>
	);

	return (
		<div className="min-h-screen flex flex-col md:flex-row pb-[env(safe-area-inset-bottom)]" style={{ backgroundColor: 'var(--bg-secondary)' }}>
			{/* SIDEBAR - DESKTOP */}
			<aside className="hidden md:flex w-72 flex-col sticky top-0 h-screen p-6 shadow-sm z-10" style={{ backgroundColor: 'var(--surface)', borderRightColor: 'var(--separator)' }}>
				<div className="mb-8 px-2 pt-2">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
							<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
						</div>
						<h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Odorik <span style={{ color: 'var(--accent)' }}>Dash</span></h1>
					</div>
					<div className="rounded-2xl px-4 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--surface)', borderWidth: '1px', borderColor: 'var(--separator)' }}>
						<div>
							<span className="text-[11px] font-semibold uppercase tracking-widest leading-none block mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('balance.credit')}</span>
						<span className={`text-xl font-bold ${parseFloat(balance) < 50 ? 'text-red-600' : ''}`} style={{ color: parseFloat(balance) < 50 ? 'var(--destructive)' : 'var(--text-primary)' }}>
								{balanceLoading ? '...' : `${balance} Kč`}
							</span>
						</div>
						<button
							onClick={() => refreshBalance(true)}
							disabled={balanceLoading}
							className="p-2 rounded-xl transition-colors disabled:opacity-30" style={{ color: 'var(--text-tertiary)' }}
							title={t('balance.refresh')}
						>
							<svg className={`w-4 h-4 ${balanceLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
						</button>
					</div>
				</div>

<nav className="space-y-1 flex-1 relative overflow-y-auto no-scrollbar">
				<button onClick={() => setActiveTab('contacts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${activeTab === 'contacts' ? '' : ''}`} style={{ backgroundColor: activeTab === 'contacts' ? 'var(--bg-secondary)' : 'transparent', color: activeTab === 'contacts' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
					{t('nav.contacts')}
				</button>

				<button onClick={() => setActiveTab('activity')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${activeTab === 'activity' ? '' : ''}`} style={{ backgroundColor: activeTab === 'activity' ? 'var(--bg-secondary)' : 'transparent', color: activeTab === 'activity' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
					{t('activity.title')}
				</button>

				<button onClick={() => setActiveTab('lines')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${activeTab === 'lines' ? '' : ''}`} style={{ backgroundColor: activeTab === 'lines' ? 'var(--bg-secondary)' : 'transparent', color: activeTab === 'lines' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
					{t('nav.lines')}
				</button>

				<button onClick={() => setActiveTab('statistics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${activeTab === 'statistics' ? '' : ''}`} style={{ backgroundColor: activeTab === 'statistics' ? 'var(--bg-secondary)' : 'transparent', color: activeTab === 'statistics' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
					{t('nav.statistics')}
				</button>

				<button onClick={() => setActiveTab('send_sms')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${activeTab === 'send_sms' ? '' : ''}`} style={{ backgroundColor: activeTab === 'send_sms' ? 'var(--bg-secondary)' : 'transparent', color: activeTab === 'send_sms' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
					{t('nav.new_sms')}
				</button>

				<button onClick={() => setActiveTab('callback')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${activeTab === 'callback' ? '' : ''}`} style={{ backgroundColor: activeTab === 'callback' ? 'var(--bg-secondary)' : 'transparent', color: activeTab === 'callback' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L9.284 3.684A1 1 0 008.284 3H5z"></path></svg>
					{t('nav.callback')}
				</button>

				<div className="pt-4">
					<div className="h-px mx-4 mb-4" style={{ backgroundColor: 'var(--separator)' }} />
				</div>

				<button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${activeTab === 'settings' ? '' : ''}`} style={{ backgroundColor: activeTab === 'settings' ? 'var(--bg-secondary)' : 'transparent', color: activeTab === 'settings' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
					{t('nav.settings')}
				</button>

				<button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium" style={{ color: 'var(--text-secondary)' }}>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
					{t('nav.logout')}
				</button>
			</nav>
			</aside>

			{/* MOBILE HEADER */}
			<header className="md:hidden sticky top-0 blur-bg border-b flex items-center justify-between px-6 py-4 z-40 shadow-sm" style={{ borderBottomColor: 'var(--separator)' }}>
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: 'var(--accent)', boxShadow: '0 4px 12px var(--shadow)' }}>
						<svg className="w-5 h-5" style={{ color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
					</div>
					<h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Odorik</h1>
				</div>

				<div className="flex flex-col items-end">
					<div className="flex items-center gap-2">
						<span className="text-md font-black" style={{ color: parseFloat(balance) < 50 ? 'var(--destructive)' : 'var(--text-primary)' }}>
							{balanceLoading ? '...' : `${balance} Kč`}
						</span>
						<button
							onClick={() => refreshBalance(true)}
							disabled={balanceLoading}
							className="p-1 disabled:opacity-30"
							title={t('balance.refresh')}
						>
							<svg className={`w-3.5 h-3.5 ${balanceLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
						</button>
					</div>
					<span className="text-[9px] font-black uppercase tracking-widest leading-none" style={{ color: 'var(--text-tertiary)' }}>{t('balance.credit')}</span>
				</div>
			</header>

			{/* MAIN CONTENT AREA */}
			<main className="flex-1 p-4 md:p-8 md:p-12 mb-16 md:mb-0">
				<div className="max-w-6xl mx-auto">
					{renderContent()}
				</div>
			</main>

			{/* MOBILE BOTTOM NAVIGATION */}
			<nav className="md:hidden fixed bottom-0 left-0 right-0 blur-bg border-t flex justify-around safe-bottom z-50 pb-[env(safe-area-inset-bottom)]" style={{ borderTopColor: 'var(--separator)', backgroundColor: 'var(--surface)' }}>
				<button onClick={() => setActiveTab('contacts')} className={`flex-1 py-1.5 flex flex-col items-center justify-center transition-opacity`} style={{ color: activeTab === 'contacts' ? 'var(--accent)' : 'var(--text-tertiary)' }}>
					<svg className="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
					<span className="text-[9px] font-medium leading-none">{t('nav.contacts')}</span>
				</button>
				<button onClick={() => setActiveTab('activity')} className={`flex-1 py-1.5 flex flex-col items-center justify-center transition-opacity`} style={{ color: activeTab === 'activity' ? 'var(--accent)' : 'var(--text-tertiary)' }}>
					<svg className="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
					<span className="text-[9px] font-medium leading-none">{t('activity.title')}</span>
				</button>
				<button onClick={() => setActiveTab('send_sms')} className={`flex-1 py-1.5 flex flex-col items-center justify-center transition-opacity`} style={{ color: activeTab === 'send_sms' ? 'var(--accent)' : 'var(--text-tertiary)' }}>
					<svg className="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
					<span className="text-[9px] font-medium leading-none">{t('nav.new_sms')}</span>
				</button>
				<button onClick={() => setActiveTab('lines')} className={`flex-1 py-1.5 flex flex-col items-center justify-center transition-opacity`} style={{ color: activeTab === 'lines' ? 'var(--accent)' : 'var(--text-tertiary)' }}>
					<svg className="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
					<span className="text-[9px] font-medium leading-none">{t('nav.lines')}</span>
				</button>
				<button onClick={() => setActiveTab('settings')} className={`flex-1 py-1.5 flex flex-col items-center justify-center transition-opacity`} style={{ color: activeTab === 'settings' ? 'var(--accent)' : 'var(--text-tertiary)' }}>
					<svg className="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
					<span className="text-[9px] font-medium leading-none">{t('nav.settings')}</span>
				</button>
			</nav>
		</div>
	);
}

export default App;
