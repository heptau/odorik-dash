import { useState, useEffect } from 'react';
import {
	fetchSimCards,
	unifyPhoneNo,
	readCache,
	writeCache,
	isCacheStale,
	isOffline,
	getSimCardsCacheKey,
	CACHE_TTL_1_DAY,
} from '../api';
import type { OdorikSimCard, OdorikCredentials } from '../api';
import { useT } from '../i18n';

// ─── helpers ──────────────────────────────────────────────────────────────────

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

const premiumLabel = (value: string): string => {
	const map: Record<string, string> = {
		off: 'Vypnuté',
		sms_payments_and_dms: 'SMS platby + DMS',
		all_other_than_sms_payments_and_dms: 'Vše kromě SMS plateb',
		all: 'Vše povoleno',
	};
	return map[value] ?? value;
};

/** Format a Unix-ms timestamp as a human-readable "last updated" hint. */
const formatLastUpdated = (ts: number): string => {
	const diffMs = Date.now() - ts;
	const diffMin = Math.floor(diffMs / 60_000);
	const diffH = Math.floor(diffMs / 3_600_000);
	if (diffMin < 1) return 'právě teď';
	if (diffMin < 60) return `před ${diffMin} min`;
	if (diffH < 24) return `před ${diffH} h`;
	return new Date(ts).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// ─── cache shape ──────────────────────────────────────────────────────────────

type SimCardsCache = { simCards: OdorikSimCard[]; ts: number };

// ─── sub-components ───────────────────────────────────────────────────────────

const StateBadge = ({ state }: { state: OdorikSimCard['state'] }) => (
	<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide`} style={{
		backgroundColor: 'var(--bg-secondary)',
		color: state === 'active' ? 'var(--success)' : 'var(--destructive)'
	}}>
		<span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: state === 'active' ? 'var(--success)' : 'var(--destructive)' }} />
		{state === 'active' ? 'Aktivní' : 'Pozastavena'}
	</span>
);

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

// ─── main component ───────────────────────────────────────────────────────────

export default function SimCards({ creds }: { creds: OdorikCredentials }) {
	const [simCards, setSimCards] = useState<OdorikSimCard[]>([]);
	const [lastUpdated, setLastUpdated] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [copiedSim, setCopiedSim] = useState<number | null>(null);
	const t = useT();

	const fetchAndCache = async (showSpinner = true) => {
		if (isOffline()) return;
		if (showSpinner) setLoading(true);
		setError('');
		try {
			const data = await fetchSimCards(creds);
			setSimCards(data);
			const ts = Date.now();
			await writeCache(getSimCardsCacheKey(creds), { simCards: data, ts });
			setLastUpdated(ts);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : t('sim_cards.error_loading');
			setError(msg);
		} finally {
			if (showSpinner) setLoading(false);
		}
	};

	useEffect(() => {
		const loadCache = async () => {
			const cached = await readCache<SimCardsCache>(getSimCardsCacheKey(creds));
			if (cached?.data?.simCards) {
				setSimCards(cached.data.simCards);
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

	const copySimNumber = async (sim: OdorikSimCard) => {
		await navigator.clipboard.writeText(sim.sim_number);
		setCopiedSim(sim.id);
		setTimeout(() => setCopiedSim(null), 2000);
	};

	// ── loading skeleton (only on truly first load with no cache) ──
	if (loading && simCards.length === 0) {
		return (
			<div className="space-y-6 animate-in fade-in duration-500">
				<div className="flex justify-between items-center p-5 rounded-2xl mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px' }}>
					<div>
						<h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('sim_cards.title')}</h2>
						<p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
					</div>
				</div>
				<div className="grid grid-cols-1 gap-6">
					{Array.from({ length: 2 }).map((_, i) => (
						<div key={i} className="p-5 rounded-2xl h-72 animate-pulse" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px' }} />
					))}
				</div>
			</div>
		);
	}

	// ── full error screen (only when cache is also empty) ──
	if (error && simCards.length === 0) {
		return (
			<div className="space-y-4 animate-in fade-in duration-500">
				<div className="flex justify-between items-center p-5 rounded-2xl" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px' }}>
					<h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{t('sim_cards.title')}</h2>
				</div>
				<div className="text-red-600 p-5 rounded-2xl flex items-center gap-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--separator)', borderWidth: '1px' }}>
					<svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<div>
						<p className="font-bold">{error}</p>
						<button onClick={() => fetchAndCache(true)} className="mt-2 text-sm font-semibold underline">
							{t('common.retry')}
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
			<div className="space-y-6 animate-in fade-in duration-500">
			{/* header */}
			<div className="flex justify-between items-center p-5 rounded-2xl" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px' }}>
				<div>
					<h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('sim_cards.title')}</h2>
					<p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
						{lastUpdated
							? `${t('sim_cards.last_updated')} ${formatLastUpdated(lastUpdated)}`
							: simCards.length === 0
								? t('sim_cards.none')
								: `${simCards.length} ${simCards.length === 1 ? t('sim_cards.card_1') : simCards.length < 5 ? t('sim_cards.cards_2_4') : t('sim_cards.cards_5')}`}
					</p>
				</div>
				<button
					onClick={() => fetchAndCache(true)}
					disabled={loading}
					className="p-3 rounded-2xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
					style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--accent)' }}
					aria-label={t('sim_cards.refresh')}
					title={isOffline() ? t('sim_cards.offline') : t('sim_cards.refresh')}
				>
					<svg className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				</button>
			</div>

			{/* offline banner */}
			{isOffline() && (
				<div className="text-amber-700 px-5 py-3 rounded-2xl flex items-center gap-3 text-sm font-semibold" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'var(--separator)', borderWidth: '1px' }}>
					<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" />
					</svg>
					{t('common.offline')}
				</div>
			)}

			{/* inline error when stale data is still shown */}
			{error && simCards.length > 0 && (
				<div className="text-red-600 px-5 py-3 rounded-2xl flex items-center gap-3 text-sm font-semibold" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--separator)', borderWidth: '1px' }}>
					<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{t('sim_cards.update_failed')}
				</div>
			)}

			{simCards.length === 0 ? (
				<div className="rounded-2xl p-12 text-center" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px', color: 'var(--text-secondary)' }}>
					{t('sim_cards.none_assigned')}
				</div>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
					{simCards.map(sim => (
						<div
							key={sim.id}
							className="rounded-2xl overflow-hidden flex flex-col"
							style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px' }}
						>
							{/* card header */}
							<div className="p-5 flex justify-between items-start gap-4" style={{ borderBottomColor: 'var(--separator)', borderBottomWidth: '0.5px' }}>
								<div className="min-w-0">
									<p className="text-2xl font-black tracking-tight tabular-nums" style={{ color: 'var(--text-primary)' }}>
										{unifyPhoneNo(sim.phone_number)}
									</p>
									<p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{t('sim_cards.line')} {sim.line}</p>
								</div>
								<div className="shrink-0 flex flex-col items-end gap-2">
									<StateBadge state={sim.state} />
									{sim.changes_in_progress.length > 0 && (
										<span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide" style={{ backgroundColor: 'var(--bg-secondary)', color: '#f59e0b' }}>
											{t('sim_cards.change_progress')}
										</span>
									)}
								</div>
							</div>

							<div className="p-5 space-y-5 flex-1">
								{/* data usage */}
								{sim.data_bought_total > 0 && (
									<div>
										<p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-tertiary)' }}>Data</p>
										<DataBar
											used={sim.data_used}
											total={sim.data_bought_total}
											validFrom={sim.data_package_valid_from}
											validTo={sim.data_package_valid_to}
										/>
									</div>
								)}

								{/* packages */}
								<div className="grid grid-cols-2 gap-3">
									<div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
										<p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>Datový balíček</p>
										<p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatPackageName(sim.data_package)}</p>
										{sim.data_package_for_next_month && sim.data_package_for_next_month !== 'none' && sim.data_package_for_next_month !== sim.data_package && (
											<p className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--accent)' }}>→ {sim.data_package_for_next_month}</p>
										)}
									</div>
									<div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
										<p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>Hlasový balíček</p>
										<p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatPackageName(sim.voice_package)}</p>
										{sim.voice_package_for_next_month && sim.voice_package_for_next_month !== 'none' && sim.voice_package_for_next_month !== sim.voice_package && (
											<p className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--accent)' }}>→ {sim.voice_package_for_next_month}</p>
										)}
									</div>
								</div>

								{/* feature toggles */}
								<div className="flex flex-wrap gap-2">
									<ToggleBadge active={sim.mobile_data} label="Data" />
									<ToggleBadge active={sim.lte} label="LTE" />
									<ToggleBadge active={sim.missed_calls_register} label="Zmeškané" />
									<ToggleBadge active={sim.roaming !== 'off' && sim.roaming !== 'unknown'} label={`Roaming: ${roamingLabel(sim.roaming)}`} />
								</div>

								{/* premium services */}
								{sim.premium_services && sim.premium_services !== 'off' && (
									<div className="px-3 py-2 rounded-xl text-xs font-bold" style={{ backgroundColor: 'var(--bg-secondary)', color: '#f59e0b' }}>
										⚠ Prémiové služby: {premiumLabel(sim.premium_services)}
									</div>
								)}

								{/* SIM number / ICCID */}
								<div className="pt-2" style={{ borderTopColor: 'var(--separator)', borderTopWidth: '0.5px' }}>
									<p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Číslo SIM (ICCID)</p>
									<button
										onClick={() => copySimNumber(sim)}
										className="w-full flex items-center justify-between hover:opacity-90 active:scale-[0.99] transition-all px-3 py-2.5 rounded-2xl group"
										style={{ backgroundColor: 'var(--bg-secondary)' }}
										title="Kopírovat ICCID"
									>
										<span className="font-mono text-sm tracking-wider truncate" style={{ color: 'var(--text-secondary)' }}>
											{sim.sim_number}
										</span>
										<span className="shrink-0 ml-2 transition-colors" style={{ color: 'var(--text-tertiary)' }}>
											{copiedSim === sim.id ? (
												<svg className="w-4 h-4" style={{ color: 'var(--success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
												</svg>
											) : (
												<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
												</svg>
											)}
										</span>
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
