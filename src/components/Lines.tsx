import { useState, useEffect } from 'react';
import {
	fetchLines,
	fetchSimCards,
	updateSimCard,
	restartSimData,
	unifyPhoneNo,
	readCache,
	writeCache,
	isCacheStale,
	isOffline,
	CACHE_TTL_1_DAY,
} from '../api';
import type { OdorikLine, OdorikSimCard, OdorikCredentials, SimCardUpdateParams } from '../api';
import { useT } from '../i18n';

type LinesSimsCache = { lines: OdorikLine[]; simCards: OdorikSimCard[]; ts: number };
type SelectedItem = { line: OdorikLine; sim: OdorikSimCard | undefined } | null;

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

const DataBar = ({ used, total, validFrom, validTo }: {
	used: number; total: number; validFrom: string; validTo: string;
}) => {
	const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
	const color = pct >= 90 ? 'var(--destructive)' : pct >= 70 ? '#f97316' : 'var(--accent)';
	const fmtDate = (iso: string) =>
		new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
	return (
		<div>
			<div className="flex justify-between items-baseline mb-1">
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

const SettingRow = ({ label, value }: { label: string; value: string | React.ReactNode }) => (
	<div className="flex justify-between items-center py-2" style={{ borderBottomColor: 'var(--separator)', borderBottomWidth: '0.5px' }}>
		<span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
		{typeof value === 'string' ? (
			<span className="text-sm" style={{ color: 'var(--text-primary)' }}>{value}</span>
		) : value}
	</div>
);

const DualToggleRow = ({
	label,
	currentValue,
	nextValue,
	onToggleCurrent,
	onToggleNext,
	disabled,
}: {
	label: string;
	currentValue: boolean;
	nextValue?: boolean;
	onToggleCurrent: () => void;
	onToggleNext: () => void;
	disabled?: boolean;
}) => {
	const hasChange = nextValue !== undefined && nextValue !== currentValue;
	return (
		<div className="flex items-center justify-between py-3" style={{ borderBottomColor: 'var(--separator)', borderBottomWidth: '0.5px' }}>
			<div>
				<p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
				<div className="flex gap-2 mt-1">
					<button
						onClick={onToggleCurrent}
						disabled={disabled}
						className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${currentValue ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-500'} ${disabled ? 'opacity-40' : 'hover:opacity-80'}`}
					>
						{currentValue ? 'Zap' : 'Vyp'} teď
					</button>
					<button
						onClick={onToggleNext}
						disabled={disabled}
						className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${hasChange ? 'bg-amber-500/20 text-amber-600' : 'bg-gray-500/20 text-gray-500'} ${disabled ? 'opacity-40' : 'hover:opacity-80'}`}
					>
						{nextValue !== undefined ? (nextValue ? 'Zap' : 'Vyp') : '---'} další
					</button>
				</div>
			</div>
		</div>
	);
};

function SimDetailModal({
	item,
	onClose,
	onUpdate,
	onRestart,
	onRefresh,
}: {
	item: { line: OdorikLine; sim: OdorikSimCard | undefined };
	onClose: () => void;
	onUpdate: (phoneNumber: string, params: SimCardUpdateParams) => Promise<void>;
	onRestart: (phoneNumber: string) => Promise<void>;
	onRefresh: () => Promise<void>;
}) {
	const { line, sim } = item;
	const [localSim, setLocalSim] = useState<OdorikSimCard | undefined>(sim);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		setLocalSim(sim);
	}, [sim]);

	const hasChangesInProgress = localSim && localSim.changes_in_progress && localSim.changes_in_progress.length > 0;

	const handleToggleCurrent = async (key: 'mobile_data' | 'lte' | 'missed_calls_register', value: boolean) => {
		if (!localSim || hasChangesInProgress) return;
		setSaving(true);
		try {
			await onUpdate(localSim.phone_number, { [key]: value });
			await onRefresh();
		} catch (err) {
			console.error('handleChange error:', err);
		} finally {
			setSaving(false);
		}
	};

	const handleToggleNext = async (key: 'mobile_data' | 'lte' | 'missed_calls_register', value: boolean) => {
		if (!localSim) return;
		setSaving(true);
		try {
			const nextMonthKey = `requested_${key}_for_next_month` as 'requested_lte_for_next_month' | 'requested_mobile_data_for_next_month' | 'requested_missed_calls_register_for_next_month';
			await onUpdate(localSim.phone_number, { [nextMonthKey]: value });
			await onRefresh();
		} catch (err) {
			console.error('handleChange error:', err);
		} finally {
			setSaving(false);
		}
	};

	const handleRestart = async () => {
		if (!localSim) return;
		setSaving(true);
		try {
			await onRestart(localSim.phone_number);
			await onRefresh();
		} catch (err) {
			console.error('handleRestart error:', err);
		} finally {
			setSaving(false);
		}
	};

	const canRestart = localSim && localSim.data_bought_total > 0 && !localSim.data_package.startsWith('perKB');

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/50" onClick={onClose} />
			<div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[34px]" style={{ backgroundColor: 'var(--surface)' }}>
				<div className="sticky top-0 p-5 flex justify-between items-center" style={{ backgroundColor: 'var(--surface)', borderBottomColor: 'var(--separator)', borderBottomWidth: '0.5px' }}>
					<div>
						<h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{line.name}</h2>
						<p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>ID {line.id}</p>
					</div>
					<button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:opacity-80" style={{ backgroundColor: 'var(--fill)' }}>
						<svg className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<div className="p-5 space-y-5">
					<div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
						<p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Telefonní číslo</p>
						<p className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
							{localSim ? unifyPhoneNo(localSim.phone_number) : unifyPhoneNo(line.caller_id || '')}
						</p>
					</div>

					{localSim && (
						<>
							{hasChangesInProgress && (
								<div className="p-3 rounded-xl flex items-center gap-2 text-sm" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
									<svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span style={{ color: 'var(--accent)' }}>Probíhá změna nastavení...</span>
								</div>
							)}

							<div className="grid grid-cols-2 gap-3">
								<div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
									<p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Stav</p>
									<p className="text-sm font-bold" style={{ color: localSim.state === 'active' ? 'var(--success)' : 'var(--destructive)' }}>
										{localSim.state === 'active' ? 'Aktivní' : 'Pozastavena'}
									</p>
								</div>
								<div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
									<p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Roaming</p>
									<p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{roamingLabel(localSim.roaming)}</p>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
									<p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Data teď</p>
									<p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatPackageName(localSim.data_package)}</p>
								</div>
								<div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
									<p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Data další</p>
									<p className="text-sm font-bold" style={{ color: localSim.data_package_for_next_month !== localSim.data_package ? 'var(--accent)' : 'var(--text-primary)' }}>
										{formatPackageName(localSim.data_package_for_next_month)}
									</p>
								</div>
								<div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
									<p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Hlas teď</p>
									<p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatPackageName(localSim.voice_package)}</p>
								</div>
								<div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
									<p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Hlas další</p>
									<p className="text-sm font-bold" style={{ color: localSim.voice_package_for_next_month !== localSim.voice_package ? 'var(--accent)' : 'var(--text-primary)' }}>
										{formatPackageName(localSim.voice_package_for_next_month)}
									</p>
								</div>
							</div>

							{localSim.data_bought_total > 0 && (
								<div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
									<DataBar
										used={localSim.data_used}
										total={localSim.data_bought_total}
										validFrom={localSim.data_package_valid_from}
										validTo={localSim.data_package_valid_to}
									/>
									{canRestart && (
										<button
											onClick={handleRestart}
											disabled={saving}
											className="mt-3 w-full py-2.5 rounded-full text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all"
											style={{ backgroundColor: 'var(--accent)', color: 'white' }}
										>
											{saving ? '...' : 'Restart dat'}
										</button>
									)}
								</div>
							)}

							<div className="space-y-1">
								<DualToggleRow
									label="Mobilní data"
									currentValue={localSim.mobile_data}
									onToggleCurrent={() => handleToggleCurrent('mobile_data', !localSim.mobile_data)}
									onToggleNext={() => handleToggleNext('mobile_data', !localSim.mobile_data)}
									disabled={saving}
								/>
								<DualToggleRow
									label="LTE"
									currentValue={localSim.lte}
									onToggleCurrent={() => handleToggleCurrent('lte', !localSim.lte)}
									onToggleNext={() => handleToggleNext('lte', !localSim.lte)}
									disabled={saving}
								/>
								<DualToggleRow
									label="Zmeškané hovory"
									currentValue={localSim.missed_calls_register}
									onToggleCurrent={() => handleToggleCurrent('missed_calls_register', !localSim.missed_calls_register)}
									onToggleNext={() => handleToggleNext('missed_calls_register', !localSim.missed_calls_register)}
									disabled={saving}
								/>
							</div>

							<div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
								<p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>ICCID</p>
								<p className="font-mono text-xs tracking-wider break-all" style={{ color: 'var(--text-secondary)' }}>
									{localSim.sim_number}
								</p>
							</div>
						</>
					)}

					<div className="space-y-2 pt-2" style={{ borderTopColor: 'var(--separator)', borderTopWidth: '1px' }}>
						<SettingRow label="SIP" value={line.active_sip === 'true' ? 'Aktivní' : 'Neaktivní'} />
						{line.caller_id && <SettingRow label="Číslo" value={unifyPhoneNo(line.caller_id)} />}
						{line.public_name && <SettingRow label="Veřejné jméno" value={line.public_name} />}
						{line.backup_number && <SettingRow label="Záložní číslo" value={unifyPhoneNo(line.backup_number)} />}
					</div>
				</div>
			</div>
		</div>
	);
}

export default function Lines({ creds }: { creds: OdorikCredentials }) {
	const [lines, setLines] = useState<OdorikLine[]>([]);
	const [simCards, setSimCards] = useState<OdorikSimCard[]>([]);
	const [lastUpdated, setLastUpdated] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [selected, setSelected] = useState<SelectedItem>(null);
	const t = useT();

	const getLinesCacheKey = (creds: OdorikCredentials): string => `odorik_lines_sims_${creds.user}`;

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

	const handleSimUpdate = async (phoneNumber: string, params: SimCardUpdateParams) => {
		try {
			await updateSimCard(creds, phoneNumber, params);
			await fetchAndCache(false);
		} catch (err) {
			const msg = err instanceof Error ? err.message : t('lines.error_loading');
			setError(msg);
		}
	};

	const handleSimRestart = async (phoneNumber: string) => {
		try {
			await restartSimData(creds, phoneNumber);
			await fetchAndCache(false);
		} catch (err) {
			const msg = err instanceof Error ? err.message : t('lines.error_loading');
			setError(msg);
		}
	};

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

	const handleSelect = (line: OdorikLine) => {
		setSelected({ line, sim: getSimForLine(line.id) });
	};

	if (loading && lines.length === 0) {
		return (
			<div className="space-y-6 animate-in fade-in duration-500">
				<div className="flex justify-between items-center mb-2">
					<div>
						<h2 className="text-[34px] leading-tight font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('lines.title')}</h2>
						<p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
					</div>
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="p-4 rounded-[26px] h-48 animate-pulse" style={{ backgroundColor: 'var(--surface)' }} />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			<div className="flex justify-between items-center mb-2">
				<div>
					<h2 className="text-[34px] leading-tight font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('lines.title')}</h2>
					<p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
						{lastUpdated
							? `${t('lines.last_updated')} ${formatLastUpdated(lastUpdated)}`
							: t('lines.subtitle')}
					</p>
				</div>
				<button
					onClick={() => fetchAndCache(true)}
					disabled={loading}
					className="w-11 h-11 flex items-center justify-center rounded-full hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
					style={{ backgroundColor: 'var(--accent-tint)', color: 'var(--accent)' }}
					aria-label={t('lines.refresh_aria')}
					title={isOffline() ? t('lines.offline') : t('lines.refresh')}
				>
					<svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				</button>
			</div>

			{isOffline() && (
				<div className="text-amber-700 px-5 py-3 rounded-2xl flex items-center gap-3 text-sm font-semibold" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
					<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" />
					</svg>
					{t('common.offline')}
				</div>
			)}

			{error && lines.length === 0 && (
				<div className="text-red-600 p-5 rounded-2xl flex items-center gap-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
					<svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span className="font-bold">{error}</span>
				</div>
			)}
			{error && lines.length > 0 && (
				<div className="text-red-600 px-5 py-3 rounded-2xl flex items-center gap-3 text-sm font-semibold" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
					<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{t('lines.update_failed')}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-8">
				{lines.map(line => {
					const sim = getSimForLine(line.id);
					const hasChanges = sim && sim.changes_in_progress && sim.changes_in_progress.length > 0;

					return (
						<button
							key={line.id}
							onClick={() => handleSelect(line)}
							className="text-left p-4 rounded-[26px] hover:opacity-90 active:scale-[0.99] transition-all"
							style={{ backgroundColor: 'var(--surface)' }}
						>
							<div className="flex justify-between items-start mb-3">
								<div className="min-w-0">
									<h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{line.name}</h3>
									<p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>ID {line.id}</p>
									{line.caller_id && (
										<p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-secondary)' }}>
											{unifyPhoneNo(line.caller_id)}
										</p>
									)}
								</div>
								<div className="shrink-0 flex flex-col items-end gap-1">
									<span className="text-[10px] font-bold" style={{ color: line.active_sip === 'true' ? 'var(--success)' : 'var(--text-tertiary)' }}>
										{line.active_sip === 'true' ? 'SIP ✓' : 'SIP ✗'}
									</span>
									{sim && (
										<span className="text-[10px] font-medium" style={{ color: sim.state === 'active' ? 'var(--success)' : 'var(--destructive)' }}>
											{sim.state === 'active' ? 'Aktivní' : 'Pozastavena'}
										</span>
									)}
									{hasChanges && (
										<span className="text-[10px] font-medium text-amber-600">Změna...</span>
									)}
								</div>
							</div>

							{sim && sim.data_bought_total > 0 && (
								<div className="mb-3">
									<DataBar
										used={sim.data_used}
										total={sim.data_bought_total}
										validFrom={sim.data_package_valid_from}
										validTo={sim.data_package_valid_to}
									/>
								</div>
							)}

							{sim && (
								<div className="grid grid-cols-3 gap-2 text-xs mb-2">
									<div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
										<p className="text-[9px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Data</p>
										<p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{formatPackageName(sim.data_package)}</p>
									</div>
									<div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
										<p className="text-[9px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Hlas</p>
										<p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{formatPackageName(sim.voice_package)}</p>
									</div>
									<div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
										<p className="text-[9px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Roaming</p>
										<p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{roamingLabel(sim.roaming)}</p>
									</div>
								</div>
							)}

							{sim && (
								<div className="flex flex-wrap gap-1.5">
									<span className={`text-[10px] px-2 py-0.5 rounded-full ${sim.mobile_data ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-500'}`}>
										{sim.mobile_data ? 'Data ✓' : 'Data ✗'}
									</span>
									<span className={`text-[10px] px-2 py-0.5 rounded-full ${sim.lte ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-500'}`}>
										LTE {sim.lte ? '✓' : '✗'}
									</span>
									<span className={`text-[10px] px-2 py-0.5 rounded-full ${sim.missed_calls_register ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-500'}`}>
										{sim.missed_calls_register ? 'Zmeškané ✓' : 'Zmeškané ✗'}
									</span>
								</div>
							)}
						</button>
					);
				})}
			</div>

			{selected && (
				<SimDetailModal
					item={selected}
					onClose={() => setSelected(null)}
					onUpdate={handleSimUpdate}
					onRestart={handleSimRestart}
					onRefresh={() => fetchAndCache(false)}
				/>
			)}
		</div>
	);
}