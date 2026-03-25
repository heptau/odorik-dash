import { useState, useEffect } from 'react';
import {
	fetchLines,
	fetchSimCards,
	unifyPhoneNo,
	readCache,
	writeCache,
	isCacheStale,
	isOffline,
	CACHE_TTL_1_DAY,
} from '../api';
import type { OdorikLine, OdorikSimCard, OdorikCredentials } from '../api';
import { useT } from '../i18n';

type LinesSimsCache = { lines: OdorikLine[]; simCards: OdorikSimCard[]; ts: number };

const formatBytes = (bytes: number): string => {
	if (!bytes || bytes === 0) return '0 MB';
	const gb = bytes / (1024 ** 3);
	if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
	const mb = bytes / (1024 ** 2);
	return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
};

const formatPackageName = (name: string): string => {
	if (!name || name === 'none') return 'Žádný';
	return name;
};

const roamingLabel = (value: string): string => {
	const map: Record<string, string> = {
		off: 'Vypnutý', basic: 'Základní', full: 'Plný', unknown: 'Neznámý',
	};
	return map[value] ?? value;
};

const formatLastUpdated = (ts: number): string => {
	const diffMs = Date.now() - ts;
	const diffMin = Math.floor(diffMs / 60_000);
	const diffH = Math.floor(diffMs / 3_600_000);
	if (diffMin < 1) return 'právě teď';
	if (diffMin < 60) return `před ${diffMin} min`;
	if (diffH < 24) return `před ${diffH} h`;
	return new Date(ts).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const StatusBadge = ({ active, label }: { active?: string; label: string }) => {
	const isActive = active != null && String(active).trim().toLowerCase() === 'true';
	const green = '#22c55e';
	const gray = '#6b7280';
	return (
		<div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider`} style={{
			backgroundColor: isActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.1)',
			color: isActive ? green : gray
		}}>
			<div className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: isActive ? green : gray, boxShadow: isActive ? `0 0 6px ${green}` : 'none' }} />
			{label}
		</div>
	);
};

const ToggleBadge = ({ active, label }: { active: boolean; label: string }) => (
	<div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider`} style={{
		backgroundColor: 'var(--bg-secondary)',
		color: active ? 'var(--accent)' : 'var(--text-tertiary)'
	}}>
		<div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active ? 'var(--accent)' : 'var(--text-tertiary)' }} />
		{label}
	</div>
);

const DataBar = ({ used, total, validFrom, validTo }: {
	used: number; total: number; validFrom: string; validTo: string;
}) => {
	const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
	const color = pct >= 90 ? 'var(--destructive)' : pct >= 70 ? '#f97316' : 'var(--accent)';
	const fmtDate = (iso: string) =>
		new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
	return (
		<div>
			<div className="flex justify-between items-baseline mb-1.5">
				<span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
					{formatBytes(used)} <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>/ {formatBytes(total)}</span>
				</span>
				<span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{pct.toFixed(0)} %</span>
			</div>
			<div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
				<div className="h-full rounded-full transition-all duration-700" style={{ backgroundColor: color, width: `${pct}%` }} />
			</div>
			{validFrom && validTo && (
				<div className="flex justify-between mt-1">
					<span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{fmtDate(validFrom)}</span>
					<span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>do {fmtDate(validTo)}</span>
				</div>
			)}
		</div>
	);
};

interface LineCardProps {
	line: OdorikLine;
	sim: OdorikSimCard | undefined;
	visiblePasswords: Set<string>;
	onTogglePassword: (id: string) => void;
	t: ReturnType<typeof useT>;
}

const LineCard = ({ line, sim, visiblePasswords, onTogglePassword, t }: LineCardProps) => {
	const [copiedSimLocal, setCopiedSimLocal] = useState<number | null>(null);

	const copySimNumber = async (sim: OdorikSimCard) => {
		await navigator.clipboard.writeText(sim.sim_number);
		setCopiedSimLocal(sim.id);
		setTimeout(() => setCopiedSimLocal(null), 2000);
	};

	return (
		<div className="rounded-2xl overflow-hidden flex flex-col group" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px' }}>
			<div className="p-5 flex justify-between items-start gap-4" style={{ borderBottomColor: 'var(--separator)', borderBottomWidth: sim ? '0.5px' : '0' }}>
				<div className="min-w-0">
					<h3 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{line.name}</h3>
					<p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-tertiary)' }}>ID {line.id}</p>
					{line.caller_id && (
						<p className="text-sm font-semibold mt-2" style={{ color: 'var(--text-secondary)' }}>
							{unifyPhoneNo(line.caller_id)}
						</p>
					)}
				</div>
				<div className="shrink-0 flex flex-col items-end gap-2">
					<StatusBadge active={line.active_sip} label="SIP" />
					<StatusBadge active={line.active_ping} label="Ping" />
				</div>
			</div>

			{sim && (
				<div className="p-5" style={{ borderBottomColor: 'var(--separator)', borderBottomWidth: '0.5px' }}>
					<div className="flex justify-between items-start mb-3">
						<div>
							<p className="text-lg font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>
								{unifyPhoneNo(sim.phone_number)}
							</p>
							<p className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>SIM karta</p>
						</div>
						<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold`} style={{
							backgroundColor: 'var(--bg-secondary)',
							color: sim.state === 'active' ? 'var(--success)' : 'var(--destructive)'
						}}>
							<span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sim.state === 'active' ? 'var(--success)' : 'var(--destructive)' }} />
							{sim.state === 'active' ? 'Aktivní' : 'Pozastavena'}
						</span>
					</div>

					{sim.data_bought_total > 0 && (
						<div className="mb-3">
							<DataBar
								used={sim.data_used}
								total={sim.data_bought_total}
								validFrom={sim.data_package_valid_from}
								validTo={sim.data_package_valid_to}
							/>
						</div>
					)}

					<div className="grid grid-cols-2 gap-2 mb-3">
						<div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
							<p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Data</p>
							<p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{formatPackageName(sim.data_package)}</p>
						</div>
						<div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
							<p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Hlas</p>
							<p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{formatPackageName(sim.voice_package)}</p>
						</div>
					</div>

					<div className="flex flex-wrap gap-1.5">
						<ToggleBadge active={sim.mobile_data} label="Data" />
						<ToggleBadge active={sim.lte} label="LTE" />
						<ToggleBadge active={sim.missed_calls_register} label="Zmeškané" />
						{sim.roaming !== 'off' && sim.roaming !== 'unknown' && (
							<ToggleBadge active={true} label={`Roaming: ${roamingLabel(sim.roaming)}`} />
						)}
					</div>

					<div className="mt-3" style={{ borderTopColor: 'var(--separator)', borderTopWidth: '0.5px' }}>
						<p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>ICCID</p>
						<button
							onClick={() => copySimNumber(sim)}
							className="w-full flex items-center justify-between hover:opacity-90 active:scale-[0.99] transition-all px-2.5 py-2 rounded-xl group"
							style={{ backgroundColor: 'var(--bg-secondary)' }}
						>
							<span className="font-mono text-xs tracking-wider truncate" style={{ color: 'var(--text-secondary)' }}>
								{sim.sim_number}
							</span>
							<span className="shrink-0 ml-2">
								{copiedSimLocal === sim.id ? (
									<svg className="w-4 h-4" style={{ color: 'var(--success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
									</svg>
								) : (
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-tertiary)' }}>
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
									</svg>
								)}
							</span>
						</button>
					</div>
				</div>
			)}

			<div className="p-5 space-y-3">
				{line.sip_password && (
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>SIP heslo</span>
						<button
							onClick={() => onTogglePassword(line.id)}
							className="flex items-center gap-2 font-mono text-sm hover:opacity-70 transition-opacity"
							style={{ color: 'var(--text-primary)' }}
						>
							{visiblePasswords.has(line.id) ? line.sip_password : '•'.repeat(Math.min(line.sip_password.length, 12))}
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								{visiblePasswords.has(line.id) ? (
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
								) : (
									<><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
								)}
							</svg>
						</button>
					</div>
				)}
				{line.public_name && (
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{t('lines.public_name')}</span>
						<span className="text-sm" style={{ color: 'var(--text-primary)' }}>{line.public_name}</span>
					</div>
				)}
				{line.backup_number && (
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{t('lines.backup_number')}</span>
						<span className="text-sm" style={{ color: 'var(--text-primary)' }}>{unifyPhoneNo(line.backup_number)}</span>
					</div>
				)}
				<div className="flex items-center justify-between">
					<span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{t('lines.forwarding')}</span>
					<div className="flex gap-2">
						<StatusBadge active={line.active_iax} label="IAX" />
						<StatusBadge active={line.active_sip} label="SIP" />
					</div>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{t('lines.callback')}</span>
					<StatusBadge active={line.active_pin} label="PIN" />
				</div>
			</div>
		</div>
	);
};

export default function Lines({ creds }: { creds: OdorikCredentials }) {
	const [lines, setLines] = useState<OdorikLine[]>([]);
	const [simCards, setSimCards] = useState<OdorikSimCard[]>([]);
	const [lastUpdated, setLastUpdated] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
	const t = useT();

	const togglePassword = (lineId: string) => {
		setVisiblePasswords(prev => {
			const next = new Set(prev);
			if (next.has(lineId)) {
				next.delete(lineId);
			} else {
				next.add(lineId);
			}
			return next;
		});
	};

	const fetchAndCache = async (showSpinner = true) => {
		if (isOffline()) return;
		if (showSpinner) setLoading(true);
		setError('');
		try {
			const [linesData, simsData] = await Promise.all([
				fetchLines(creds),
				fetchSimCards(creds),
			]);
			setLines(linesData);
			setSimCards(simsData);
			const ts = Date.now();
			await writeCache(getLinesCacheKey(creds), { lines: linesData, simCards: simsData, ts });
			setLastUpdated(ts);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : t('lines.error_loading');
			setError(msg);
		} finally {
			if (showSpinner) setLoading(false);
		}
	};

	const getLinesCacheKey = (_creds: OdorikCredentials): string => `odorik_lines_sims_${creds.user}`;

	useEffect(() => {
		const loadCache = async () => {
			const cached = await readCache<LinesSimsCache>(getLinesCacheKey(creds));
			if (cached?.data?.lines) {
				setLines(cached.data.lines);
				setSimCards(cached.data.simCards || []);
				setLastUpdated(cached.data.ts ?? cached.timestamp);
				setLoading(false);

				if (isCacheStale(cached, CACHE_TTL_1_DAY) && !isOffline()) {
					fetchAndCache(false);
				}
			} else {
				fetchAndCache(true);
			}
		};
		loadCache();
	}, [creds]);

	const getSimForLine = (lineId: string): OdorikSimCard | undefined => {
		return simCards.find(sim => sim.line === Number(lineId));
	};

	if (loading && lines.length === 0) {
		return (
			<div className="space-y-6 animate-in fade-in duration-500">
				<div className="flex justify-between items-center p-5 rounded-2xl mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px' }}>
					<div>
						<h2 className="text-2xl font-black tracking-tight font-display" style={{ color: 'var(--text-primary)' }}>{t('lines.title')}</h2>
						<p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
					</div>
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="p-5 rounded-2xl h-72 animate-pulse" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px' }} />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			<div className="flex justify-between items-center p-5 rounded-2xl mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px' }}>
				<div>
					<h2 className="text-2xl font-black tracking-tight font-display" style={{ color: 'var(--text-primary)' }}>{t('lines.title')}</h2>
					<p className="text-sm font-medium">
						{lastUpdated
							? `${t('lines.last_updated')} ${formatLastUpdated(lastUpdated)}`
							: t('lines.subtitle')}
					</p>
				</div>
				<button
					onClick={() => fetchAndCache(true)}
					disabled={loading}
					className="p-3 rounded-2xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
					style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)' }}
					aria-label={t('lines.refresh_aria')}
					title={isOffline() ? t('lines.offline') : t('lines.refresh')}
				>
					<svg className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				</button>
			</div>

			{isOffline() && (
				<div className="text-amber-700 px-5 py-3 rounded-2xl flex items-center gap-3 text-sm font-semibold" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'var(--separator)', borderWidth: '1px' }}>
					<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" />
					</svg>
					{t('common.offline')}
				</div>
			)}

			{error && lines.length === 0 && (
				<div className="text-red-600 p-5 rounded-2xl flex items-center gap-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--separator)', borderWidth: '1px' }}>
					<svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span className="font-bold">{error}</span>
				</div>
			)}
			{error && lines.length > 0 && (
				<div className="text-red-600 px-5 py-3 rounded-2xl flex items-center gap-3 text-sm font-semibold" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--separator)', borderWidth: '1px' }}>
					<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{t('lines.update_failed')}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
				{lines.map(line => (
					<LineCard
						key={line.id}
						line={line}
						sim={getSimForLine(line.id)}
						visiblePasswords={visiblePasswords}
						onTogglePassword={togglePassword}
						t={t}
					/>
				))}
			</div>
		</div>
	);
}