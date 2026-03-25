import { useI18n, AVAILABLE_LOCALES, useT } from '../i18n';

declare const __APP_VERSION__: string;

interface SettingsProps {
	onClearCache?: () => void;
}

export default function Settings({ onClearCache }: SettingsProps) {
	const { locale, setLocale } = useI18n();
	const t = useT();
	const version = __APP_VERSION__ || 'dev';

	const handleChange = (newLocale: 'auto' | 'en' | 'cs') => {
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
				<div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)' }}>
					{AVAILABLE_LOCALES.map((l, i) => (
						<button
							key={l.code}
							onClick={() => handleChange(l.code)}
							className="w-full px-4 py-3 flex justify-between items-center transition-colors"
							style={{
								backgroundColor: locale === l.code ? 'var(--bg-secondary)' : 'transparent',
								borderBottom: i < AVAILABLE_LOCALES.length - 1 ? '0.5px solid var(--separator)' : 'none'
							}}
						>
							<span style={{ color: 'var(--text-primary)' }}>{l.name}</span>
							{locale === l.code && (
								<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'var(--accent)' }}>
									<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
								</svg>
							)}
						</button>
					))}
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
					<div className="p-4 flex justify-between items-center" style={{ borderBottom: '0.5px solid var(--separator)' }}>
						<span className="text-base" style={{ color: 'var(--text-primary)' }}>{t('settings.version')}</span>
						<span className="text-base" style={{ color: 'var(--text-secondary)' }}>{version}</span>
					</div>
					<div className="p-4">
						<span className="text-base" style={{ color: 'var(--text-primary)' }}>{t('settings.aboutText')}</span>
					</div>
				</div>
			</section>
		</div>
	);
}