import { useState } from 'react';
import { useI18n, getGroupedLocales, useT, type Locale } from '../i18n';

declare const __APP_VERSION__: string;

interface SettingsProps {
	onClearCache?: () => void;
}

export default function Settings({ onClearCache }: SettingsProps) {
	const { locale, setLocale } = useI18n();
	const t = useT();
	const version = __APP_VERSION__ || 'dev';
	const { suggested, other } = getGroupedLocales();
	const [showAboutDetails, setShowAboutDetails] = useState(false);

	const renderLocaleButtons = (locales: typeof suggested, isLast: boolean) => locales.map((l, i) => (
		<button
			key={l.code}
			onClick={() => handleChange(l.code)}
			className={`w-full px-4 py-3 flex justify-between items-center transition-colors ${i === 0 ? 'rounded-t-2xl' : ''} ${isLast && i === locales.length - 1 ? 'rounded-b-2xl' : ''}`}
			style={{
				backgroundColor: 'transparent',
				borderBottom: i < locales.length - 1 ? '0.5px solid var(--separator)' : 'none'
			}}
		>
			<span style={{ color: 'var(--text-primary)' }}>{l.name}</span>
			{locale === l.code && (
				<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'var(--accent)' }}>
					<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
				</svg>
			)}
		</button>
	));

	const handleChange = (newLocale: Locale) => {
		setLocale(newLocale);
	};

	const handleClearCache = () => {
		if (confirm(t('settings.clear_cache_confirm') || 'Opravdu smazat cache?')) {
			onClearCache?.();
		}
	};

	return (
		<div className="space-y-6 animate-in fade-in duration-300">
			<div>
				<h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('settings.title')}</h2>
			</div>

			<section>
				<h3 className="text-xs font-medium ml-4 mb-2" style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
					{t('settings.language')}
				</h3>
				<div className="space-y-4">
					<h4 className="text-xs font-medium ml-4 mb-1" style={{ color: 'var(--text-secondary)' }}>
						{t('settings.language_suggested')}
					</h4>
					<div className="overflow-hidden rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '0.5px solid var(--separator)' }}>
						{renderLocaleButtons(suggested, other.length === 0)}
					</div>
					{other.length > 0 && (
						<>
							<h4 className="text-xs font-medium ml-4 mb-1" style={{ color: 'var(--text-secondary)' }}>
								{t('settings.language_other')}
							</h4>
							<div className="overflow-hidden rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '0.5px solid var(--separator)' }}>
								{renderLocaleButtons(other, true)}
							</div>
						</>
					)}
				</div>
			</section>

			<section>
				<h3 className="text-xs font-medium ml-4 mb-2" style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
					{t('settings.cache')}
				</h3>
				<div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)' }}>
					<button
						onClick={handleClearCache}
						className="w-full px-4 py-3 flex justify-between items-center transition-colors"
						style={{ color: 'var(--destructive)' }}
					>
						<span>{t('settings.clear_cache')}</span>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
					</button>
				</div>
			</section>

			<section>
				<h3 className="text-xs font-medium ml-4 mb-2" style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
					{t('settings.about')}
				</h3>
				<div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)' }}>
					<button onClick={() => setShowAboutDetails(!showAboutDetails)} className="w-full">
						<div className="p-4 flex justify-between items-center" style={{ borderBottom: showAboutDetails ? 'none' : '0.5px solid var(--separator)' }}>
							<div className="flex flex-col items-start">
								<span className="text-base" style={{ color: 'var(--text-primary)' }}>{t('settings.version')}: {version}</span>
								<span className="text-sm" style={{ color: 'var(--text-secondary)' }}>MIT License</span>
							</div>
							<div className="flex items-center gap-2">
								{!showAboutDetails && (
									<a href="https://github.com/your-repo/odorik-dash" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-sm px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--accent-tint)', color: 'var(--accent)' }}>
										GitHub
									</a>
								)}
								<svg className={`w-4 h-4 transition-transform ${showAboutDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-tertiary)' }}>
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
								</svg>
							</div>
						</div>
					</button>
					{showAboutDetails && (
						<div className="px-4 pb-4 space-y-3">
							<p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t('settings.aboutText')}</p>
							<div className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
								<p><strong style={{ color: 'var(--text-primary)' }}>API:</strong> Uses Odorik.cz REST API for calls, SMS, contacts, and balance.</p>
								<p><strong style={{ color: 'var(--text-primary)' }}>Author:</strong> Open source project</p>
								<p><strong style={{ color: 'var(--text-primary)' }}>License:</strong> MIT</p>
								<p><strong style={{ color: 'var(--text-primary)' }}>Tech:</strong> React 19, TypeScript, Tailwind CSS 4, Vite</p>
								<a href="https://github.com/your-repo/odorik-dash" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm" style={{ color: 'var(--accent)' }}>
									<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
									View on GitHub
								</a>
							</div>
						</div>
					)}
				</div>
			</section>
		</div>
	);
}