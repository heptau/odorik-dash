import { useState } from 'react';
import { unifyPhoneNo, lookupContactOrLine, parseContactName } from '../api';
import type { ActivityItem, Contact, OdorikLine } from '../api';
import { SkeletonList } from './Skeleton';
import { useT } from '../i18n';
import type { FilterType } from '../hooks/useActivity';

interface ActivityProps {
	activity: ActivityItem[];
	loading: boolean;
	loadingMore: boolean;
	error: string | null;
	selectedType: FilterType;
	onTypeChange: (type: FilterType) => void;
	selectedLine: string;
	onLineChange: (line: string) => void;
	lines: OdorikLine[];
	onLoadMore: () => void;
	contacts?: Contact[];
}

export default function Activity({ activity, loading, loadingMore, error, selectedType, onTypeChange, selectedLine, onLineChange, lines, onLoadMore, contacts = [] }: ActivityProps) {
	const [search, setSearch] = useState('');
	const t = useT();

	const filtered = activity.filter(item => {
		if (selectedType === 'calls' && item.type !== 'call') return false;
		if (selectedType === 'sms' && item.type !== 'sms') return false;
		if (selectedLine && String(item.line) !== selectedLine) return false;
		if (!search.trim()) return true;

		const q = search.toLowerCase();
		const srcMatch = lookupContactOrLine(item.source_number, contacts, lines);
		const dstMatch = lookupContactOrLine(item.destination_number, contacts, lines);
		const srcName = srcMatch?.type === 'contact' ? srcMatch.contact.name : srcMatch?.type === 'line' ? srcMatch.line.name : '';
		const dstName = dstMatch?.type === 'contact' ? dstMatch.contact.name : dstMatch?.type === 'line' ? dstMatch.line.name : '';
		return (
			item.source_number.includes(q) ||
			item.destination_number.includes(q) ||
			(srcName && srcName.toLowerCase().includes(q)) ||
			(dstName && dstName.toLowerCase().includes(q))
		);
	});

	const formatDuration = (sec: number) => {
		if (!sec) return '0 s';
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return m > 0 ? `${m} m ${s} s` : `${s} s`;
	};

	if (loading) {
		return (
			<div className="mb-4">
				<h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('activity.title')}</h2>
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
			</div>
		);
	}

	return (
		<>
			<div className="mb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
				<h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('activity.title')}</h2>
				<div className="flex gap-2">
					<select
						value={selectedType}
						onChange={(e) => onTypeChange(e.target.value as FilterType)}
						className="min-w-[120px] px-4 py-2.5 rounded-2xl text-sm font-medium border outline-none appearance-none cursor-pointer"
						style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--separator)', color: 'var(--text-primary)', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
					>
						<option value="all">{t('filter.all')}</option>
						<option value="calls">{t('filter.calls')}</option>
						<option value="sms">{t('filter.sms')}</option>
					</select>
					{lines.length > 0 && (
						<select
							value={selectedLine}
							onChange={(e) => onLineChange(e.target.value)}
							className="min-w-[120px] px-4 py-2.5 rounded-2xl text-sm font-medium border outline-none appearance-none cursor-pointer"
							style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--separator)', color: 'var(--text-primary)', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
						>
							<option value="">{t('filter.all_lines')}</option>
							{lines.map(line => (
								<option key={line.id} value={line.id}>{line.name}</option>
							))}
						</select>
					)}
				</div>
			</div>

			{activity.length > 0 && (
				<div className="mb-4">
					<input
						type="search"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder={t('activity.search')}
						className="w-full px-4 py-2.5 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
						style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', color: 'var(--text-primary)' }}
					/>
				</div>
			)}

			<div className="rounded-2xl shadow-sm divide-y overflow-hidden mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px', borderStyle: 'solid' }}>
				{filtered.length === 0 ? (
					<div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
						{search ? t('activity.no_results') : t('activity.empty')}
					</div>
				) : filtered.map((item) => {
					if (item.type === 'call') {
						const c = item; // OdorikCall & { type: 'call' }
						const isMissed = c.status === 'missed';
						const isInbound = c.direction === 'in';
						const isRedirected = c.direction === 'redirected';

						const iconBg = isMissed
							? { backgroundColor: 'var(--bg-secondary)', color: 'var(--destructive)' }
							: isInbound
								? { backgroundColor: 'var(--bg-secondary)', color: 'var(--success)' }
								: isRedirected
									? { backgroundColor: 'var(--bg-secondary)', color: '#a855f7' }
									: { backgroundColor: 'var(--bg-secondary)', color: 'var(--accent)' };

						return (
							<div key={`call-${c.id}`} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors" style={{ borderBottomColor: 'var(--separator)', borderBottomWidth: '1px', borderBottomStyle: 'solid' }}>
								<div className="flex items-center gap-3 md:gap-4">
									<div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0`} style={iconBg}>
										{isMissed ? (
											<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7l2.293-2.293M15 7l2.293 2.293M15 7h4"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
										) : isInbound ? (
											<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
										) : (
											<svg className="w-5 h-5 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
										)}
									</div>

{(() => {
									const getLineForNumber = (phone: string) => {
										const fromMatch = lookupContactOrLine(phone, contacts, lines);
										if (fromMatch?.type === 'line') return fromMatch.line;
										if (phone.startsWith('*') || phone.startsWith('#')) {
											const lineNumStr = phone.slice(1);
											return lines.find(l => String(l.id) === lineNumStr) ?? undefined;
										}
										return undefined;
									};

									const srcMatch = lookupContactOrLine(c.source_number, contacts, lines);
										const dstMatch = lookupContactOrLine(c.destination_number, contacts, lines);
										const srcContact = srcMatch?.type === 'contact' ? srcMatch.contact : null;
										const dstContact = dstMatch?.type === 'contact' ? dstMatch.contact : null;
										const srcLine = srcMatch?.type === 'line' ? srcMatch.line : getLineForNumber(c.source_number);
										const dstLine = dstMatch?.type === 'line' ? dstMatch.line : getLineForNumber(c.destination_number);
										const srcParsed = srcContact ? parseContactName(srcContact.name) : null;
										const dstParsed = dstContact ? parseContactName(dstContact.name) : null;

										const renderParty = (
											label: string,
											rawPhone: string,
											parsed: ReturnType<typeof parseContactName> | null,
											line: OdorikLine | null,
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
												) : line ? (
													<>
														<span className={`font-semibold text-[15px] truncate leading-tight ${highlight ? 'text-red-600' : ''}`} style={{ color: highlight ? 'var(--destructive)' : 'var(--text-primary)' }}>
															{line.name}
														</span>
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
													{renderParty(t('calls.from'), c.source_number, srcParsed, srcLine ?? null, isMissed && isInbound)}
													<span className="mt-3 shrink-0" style={{ color: 'var(--text-tertiary)' }}>→</span>
													{renderParty(t('calls.to'), c.destination_number, dstParsed, dstLine ?? null, isMissed && !isInbound)}
												</div>
												<span className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
													{new Date(c.date).toLocaleString('cs-CZ')}
												</span>
											</div>
										);
									})()}
								</div>

								<div className="flex items-center justify-between md:justify-end gap-6 ml-[52px] md:ml-0 pt-3 md:pt-0 mt-1 md:mt-0">
									<div className="flex flex-col text-left md:text-right">
										<span className="text-[13px] uppercase tracking-wide font-medium" style={{ color: 'var(--text-secondary)' }}>{t('calls.line')}</span>
										<span className="font-medium" style={{ color: 'var(--text-primary)' }}>{lines.find(l => String(l.id) === String(c.line))?.name ?? c.line}</span>
									</div>
									<div className="flex flex-col text-right">
										<span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatDuration(c.length)}</span>
										<span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{c.price} Kč</span>
									</div>
								</div>
							</div>
						);
					} else {
						// SMS item
						const s = item; // OdorikSMS & { type: 'sms' }
						return (
							<div key={`sms-${s.id}`} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors" style={{ borderBottomColor: 'var(--separator)', borderBottomWidth: '1px', borderBottomStyle: 'solid' }}>
								<div className="flex items-center gap-3 md:gap-4">
									<div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--accent)' }}>
										<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
									</div>

{(() => {
									const getLineForNumber = (phone: string) => {
										const fromMatch = lookupContactOrLine(phone, contacts, lines);
										if (fromMatch?.type === 'line') return fromMatch.line;
										if (phone.startsWith('*') || phone.startsWith('#')) {
											const lineNumStr = phone.slice(1);
											return lines.find(l => String(l.id) === lineNumStr) ?? undefined;
										}
										return undefined;
									};

									const srcMatch = lookupContactOrLine(s.source_number, contacts, lines);
										const dstMatch = lookupContactOrLine(s.destination_number, contacts, lines);
										const srcContact = srcMatch?.type === 'contact' ? srcMatch.contact : null;
										const dstContact = dstMatch?.type === 'contact' ? dstMatch.contact : null;
										const srcLine = srcMatch?.type === 'line' ? srcMatch.line : getLineForNumber(s.source_number);
										const dstLine = dstMatch?.type === 'line' ? dstMatch.line : getLineForNumber(s.destination_number);
										const srcParsed = srcContact ? parseContactName(srcContact.name) : null;
										const dstParsed = dstContact ? parseContactName(dstContact.name) : null;

										const renderParty = (
											label: string,
											rawPhone: string,
											parsed: ReturnType<typeof parseContactName> | null,
											line: OdorikLine | null,
										) => (
											<span className="inline-flex flex-col min-w-0">
												<span className="text-[11px] font-semibold uppercase tracking-wide leading-none mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
												{parsed ? (
													<>
														<span className="font-semibold text-[15px] truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
															{parsed.displayName}
														</span>
														{parsed.note && (
															<span className="text-[11px] leading-tight truncate" style={{ color: 'var(--text-tertiary)' }}>{parsed.note}</span>
														)}
														<span className="text-[11px] leading-tight" style={{ color: 'var(--text-tertiary)' }}>{unifyPhoneNo(rawPhone)}</span>
													</>
												) : line ? (
													<>
														<span className="font-semibold text-[15px] truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
															{line.name}
														</span>
														<span className="text-[11px] leading-tight" style={{ color: 'var(--text-tertiary)' }}>{unifyPhoneNo(rawPhone)}</span>
													</>
												) : (
													<span className="font-semibold text-[15px] truncate" style={{ color: 'var(--text-primary)' }}>
														{unifyPhoneNo(rawPhone)}
													</span>
												)}
											</span>
										);

										return (
											<div className="flex flex-col min-w-0">
												<div className="flex items-start gap-2">
													{renderParty('Od', s.source_number, srcParsed, srcLine ?? null)}
													<span className="mt-3 shrink-0" style={{ color: 'var(--text-tertiary)' }}>→</span>
													{renderParty('Na', s.destination_number, dstParsed, dstLine ?? null)}
												</div>
												<span className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
													{new Date(s.date).toLocaleString('cs-CZ')}
												</span>
											</div>
										);
									})()}
								</div>

								<div className="flex items-center justify-between md:justify-end gap-6 ml-[52px] md:ml-0 pt-3 md:pt-0 mt-1 md:mt-0">
									<div className="flex flex-col text-left md:text-right">
										<span className="text-[13px] uppercase tracking-wide font-medium" style={{ color: 'var(--text-secondary)' }}>{t('calls.line')}</span>
										<span className="font-medium" style={{ color: 'var(--text-primary)' }}>{lines.find(l => String(l.id) === String(s.line))?.name ?? s.line}</span>
									</div>
									<div className="flex flex-col text-right">
										<span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{s.price} Kč</span>
									</div>
								</div>
							</div>
						);
					}
				})}
			</div>

			{activity.length > 0 && (
				<button
					onClick={onLoadMore}
					disabled={loadingMore}
					className="w-full py-4 border rounded-2xl font-semibold transition-all disabled:opacity-50 mb-10"
					style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', color: 'var(--text-secondary)' }}
				>
					{loadingMore ? t('common.loading') : t('activity.load_more')}
				</button>
			)}
		</>
	);
}
