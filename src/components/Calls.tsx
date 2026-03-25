import { useState, useEffect, useMemo } from 'react';
import { fetchCalls, unifyPhoneNo, loadFromCache, saveToCache, getCacheKey, lookupContact, parseContactName } from '../api';
import type { OdorikCall, OdorikCredentials, Contact } from '../api';
import { SkeletonList } from './Skeleton';
import { useT } from '../i18n';

export default function Calls({ creds, contacts = [] }: { creds: OdorikCredentials; contacts?: Contact[] }) {
	const [calls, setCalls] = useState<OdorikCall[]>([]);
	const [initialLoading, setInitialLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [error, setError] = useState('');
	const [search, setSearch] = useState('');
	const t = useT();

	const cacheKey = getCacheKey(creds, 'calls');

	const filteredCalls = useMemo(() => {
		if (!search.trim()) return calls;
		const q = search.toLowerCase();
		return calls.filter(c => {
			const srcContact = lookupContact(c.source_number, contacts);
			const dstContact = lookupContact(c.destination_number, contacts);
			return (
				c.source_number.includes(q) ||
				c.destination_number.includes(q) ||
				c.destination_name.toLowerCase().includes(q) ||
				(srcContact && srcContact.name.toLowerCase().includes(q)) ||
				(dstContact && dstContact.name.toLowerCase().includes(q))
			);
		});
	}, [calls, contacts, search]);

	useEffect(() => {
		if (!creds) return;

		// Safety timeout - force hide loading after 10s
		const timeout = setTimeout(() => setInitialLoading(false), 10000);

		// Initial load from cache
		const loadCache = async () => {
			const cachedData = await loadFromCache<OdorikCall>(cacheKey);
			if (cachedData.length > 0) {
				setCalls(cachedData);
				setInitialLoading(false);
				syncNewData(cachedData);
			} else {
				loadInitial();
			}
		};
		loadCache();

		return () => clearTimeout(timeout);
	}, [creds]);

	const syncNewData = async (existingCalls: OdorikCall[]) => {
		setIsRefreshing(true);
		try {
			// Find the latest date in existing data
			const latestCall = existingCalls.reduce((max, c) =>
				new Date(c.date) > new Date(max.date) ? c : max, existingCalls[0]);

			const fromDate = new Date(latestCall.date);
			fromDate.setSeconds(fromDate.getSeconds() + 1);
			const toDate = new Date();

			if (fromDate >= toDate) {
				setIsRefreshing(false);
				return;
			}

			const newData = await fetchCalls(creds, fromDate.toISOString(), toDate.toISOString());
			if (newData.length > 0) {
				// Merge and deduplicate by id
				const merged = [...newData, ...existingCalls];
				const unique = Array.from(new Map(merged.map(c => [c.id, c])).values());
				const sorted = unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
				setCalls(sorted);
				saveToCache(cacheKey, sorted);
			}
		} catch (err) {
			console.error('Failed to sync new data', err);
			setError(err instanceof Error ? err.message : 'Failed to sync new data');
		} finally {
			setIsRefreshing(false);
		}
	};

	const loadInitial = async () => {
		setInitialLoading(true);
		try {
			const d = new Date();
			d.setDate(d.getDate() - 30);
			const fromDate = d.toISOString();
			const toDate = new Date().toISOString();

			const data = await fetchCalls(creds, fromDate, toDate);
			const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
			setCalls(sorted);
			saveToCache(cacheKey, sorted);
		} catch (err) {
			setError(err instanceof Error ? err.message : t('calls.error_loading'));
		} finally {
			setInitialLoading(false);
		}
	};

	const loadMore = async () => {
		if (loadingMore || isRefreshing || calls.length === 0) return;
		setLoadingMore(true);
		try {
			const oldestCall = calls[calls.length - 1];
			const toDate = new Date(oldestCall.date);
			toDate.setSeconds(toDate.getSeconds() - 1);

			const fromDate = new Date(toDate);
			fromDate.setDate(fromDate.getDate() - 60);

			const moreData = await fetchCalls(creds, fromDate.toISOString(), toDate.toISOString());
			if (moreData.length > 0) {
				const merged = [...calls, ...moreData];
				const unique = Array.from(new Map(merged.map(c => [c.id, c])).values());
				const sorted = unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
				setCalls(sorted);
				saveToCache(cacheKey, sorted);
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : t('calls.error_loading');
			alert(msg);
		} finally {
			setLoadingMore(false);
		}
	};

	const formatDuration = (sec: number) => {
		if (!sec) return '0 s';
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return m > 0 ? `${m} m ${s} s` : `${s} s`;
	};

	if (initialLoading) {
		return (
			<div className="mb-4">
				<h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('calls.title')}</h2>
				<div className="rounded-2xl shadow-sm overflow-hidden p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px', borderStyle: 'solid' }}>
					<SkeletonList count={5} />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-50 text-red-600 p-5 rounded-2xl border border-red-100 shadow-sm mt-4">
				<h3 className="font-bold mb-2 text-lg">{t('common.error')}</h3>
				<p className="text-sm opacity-90">{error}</p>
				<button onClick={loadInitial} className="mt-4 px-5 py-2.5 rounded-xl shadow-sm text-sm font-semibold transition-transform" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px', borderStyle: 'solid', color: 'var(--text-primary)' }}>{t('common.retry')}</button>
			</div>
		);
	}

	return (
		<>
			<div className="mb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
				<h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
					{t('calls.title')}
					{isRefreshing && (
						<div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
					)}
				</h2>
				<div className="text-sm font-medium bg-white px-3 py-1.5 rounded-lg border w-fit" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', color: 'var(--text-secondary)' }}>
					{search ? `${filteredCalls.length} / ` : ''}{calls.length} {t('calls.shown')}
				</div>
			</div>

			{calls.length > 0 && (
				<div className="mb-4">
					<input
						type="search"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder={t('calls.search')}
						className="w-full px-4 py-2.5 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
						style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', color: 'var(--text-primary)' }}
					/>
				</div>
			)}

			<div className="rounded-2xl shadow-sm divide-y overflow-hidden mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px', borderStyle: 'solid' }}>
				{filteredCalls.length === 0 ? (
					<div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
						{search ? t('calls.no_results') : t('calls.empty')}
					</div>
				) : filteredCalls.map((c) => {
					const isMissed = c.status === 'missed';
					const isInbound = c.direction === 'in';
					const isRedirected = c.direction === 'redirected';

					// Icon colour based on call type
					const iconBg = isMissed
						? { backgroundColor: 'var(--bg-secondary)', color: 'var(--destructive)' }
						: isInbound
							? { backgroundColor: 'var(--bg-secondary)', color: 'var(--success)' }
							: isRedirected
								? { backgroundColor: 'var(--bg-secondary)', color: '#a855f7' }
								: { backgroundColor: 'var(--bg-secondary)', color: 'var(--accent)' };

					return (
						<div key={c.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors" style={{ borderBottomColor: 'var(--separator)', borderBottomWidth: '1px', borderBottomStyle: 'solid' }}>
							<div className="flex items-center gap-3 md:gap-4">
								{/* Direction icon */}
								<div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0`} style={iconBg}>
									{isMissed ? (
										<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7l2.293-2.293M15 7l2.293 2.293M15 7h4"></path></svg>
									) : isInbound ? (
										<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
									) : (
										<svg className="w-5 h-5 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
									)}
								</div>

								{/* Both parties: Od → Na, same style as SMS */}
								{(() => {
									const srcContact = lookupContact(c.source_number, contacts);
									const dstContact = lookupContact(c.destination_number, contacts);
									const srcParsed = srcContact ? parseContactName(srcContact.name) : null;
									const dstParsed = dstContact ? parseContactName(dstContact.name) : null;

									const renderParty = (
										label: string,
										rawPhone: string,
										parsed: ReturnType<typeof parseContactName> | null,
										highlight: boolean,
									) => (
										<span className="inline-flex flex-col min-w-0">
											<span className="text-[11px] font-semibold uppercase tracking-wide leading-none mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
												{parsed ? (
													<>
														<span className={`font-semibold text-[15px] truncate leading-tight ${highlight ? 'text-red-600' : ''}`} style={{ color: highlight ? 'var(--destructive)' : 'var(--text-primary)' }}>
															{parsed.displayName}
														</span>
														{parsed.note && (
															<span className="text-[11px] leading-tight truncate" style={{ color: 'var(--text-tertiary)' }}>{parsed.note}</span>
														)}
														<span className="text-[11px] leading-tight" style={{ color: 'var(--text-tertiary)' }}>{unifyPhoneNo(rawPhone)}</span>
													</>
												) : (
													<span className={`font-semibold text-[15px] truncate ${highlight ? 'text-red-600' : ''}`} style={{ color: highlight ? 'var(--destructive)' : 'var(--text-primary)' }}>
														{unifyPhoneNo(rawPhone)}
													</span>
												)}
										</span>
									);

									return (
										<div className="flex flex-col min-w-0">
											<div className="flex items-start gap-2">
												{renderParty(t('calls.from'), c.source_number, srcParsed, isMissed && isInbound)}
<span className="mt-3 shrink-0" style={{ color: 'var(--text-tertiary)' }}>→</span>
											{renderParty(t('calls.to'), c.destination_number, dstParsed, isMissed && !isInbound)}
										</div>
										<span className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
												{new Date(c.date).toLocaleString('cs-CZ')}
											</span>
										</div>
									);
								})()}
							</div>

							{/* Right side: line · duration · price */}
							<div className="flex items-center justify-between md:justify-end gap-6 ml-[52px] md:ml-0 pt-3 md:pt-0 mt-1 md:mt-0" style={{ borderTopColor: 'var(--separator)', borderTopWidth: '1px', borderTopStyle: 'solid' }}>
								<div className="flex flex-col text-left md:text-right">
									<span className="text-[13px] uppercase tracking-wide font-medium" style={{ color: 'var(--text-secondary)' }}>{t('calls.line')}</span>
									<span className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.line}</span>
								</div>
								<div className="flex flex-col text-right">
									<span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatDuration(c.length)}</span>
									<span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{c.price} Kč</span>
								</div>
							</div>
						</div>
					);
				})}
			</div>

		{calls.length > 0 && (
			<button
				onClick={loadMore}
				disabled={loadingMore || isRefreshing}
				className="w-full py-4 border rounded-2xl font-semibold transition-all disabled:opacity-50 mb-10"
				style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', color: 'var(--text-secondary)' }}
			>
				{loadingMore ? t('common.loading') : t('calls.load_more')}
			</button>
		)}
		</>
	);
}
