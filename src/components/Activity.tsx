import { useState } from 'react';
import { createPortal } from 'react-dom';
import { unifyPhoneNo, lookupContactOrLine, parseContactName } from '../api';
import type { ActivityItem, Contact, OdorikLine } from '../api';
import { SkeletonList } from './Skeleton';
import { useI18n, useT } from '../i18n';
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
	balance?: { amount: string; currency: string };
}

export default function Activity({ activity, loading, loadingMore, error, selectedType, onTypeChange, selectedLine, onLineChange, lines, onLoadMore, contacts = [], balance }: ActivityProps) {
	const [search, setSearch] = useState('');
	const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);
	const t = useT();
	const { locale } = useI18n();

	const translate = (str: string) => {
		const map: Record<string, Record<string, string>> = {
			cs: { 'Call': 'Volání', 'SMS': 'SMS', 'Received': 'Přijatá', 'Sent': 'Odeslaná', 'Incoming': 'Přijaté', 'Outgoing': 'Odchozí', 'Redirected': 'Přesměrované', 'Missed': 'Zmeškané', 'Answered': 'Přijaté' },
			en: { 'Call': 'Call', 'SMS': 'SMS', 'Received': 'Received', 'Sent': 'Sent', 'Incoming': 'Incoming', 'Outgoing': 'Outgoing', 'Redirected': 'Redirected', 'Missed': 'Missed', 'Answered': 'Answered' },
			de: { 'Call': 'Anruf', 'SMS': 'SMS', 'Received': 'Empfangen', 'Sent': 'Gesendet', 'Incoming': 'Eingehend', 'Outgoing': 'Ausgehend', 'Redirected': 'Weitergeleitet', 'Missed': 'Verpasst', 'Answered': 'Angenommen' },
			es: { 'Call': 'Llamada', 'SMS': 'SMS', 'Received': 'Recibido', 'Sent': 'Enviado', 'Incoming': 'Entrante', 'Outgoing': 'Saliente', 'Redirected': 'Redirigido', 'Missed': 'Perdido', 'Answered': 'Contestado' },
			fr: { 'Call': 'Appel', 'SMS': 'SMS', 'Received': 'Reçu', 'Sent': 'Envoyé', 'Incoming': 'Entrant', 'Outgoing': 'Sortant', 'Redirected': 'Redirigé', 'Missed': 'Manqué', 'Answered': 'Répondu' },
			it: { 'Call': 'Chiamata', 'SMS': 'SMS', 'Received': 'Ricevuto', 'Sent': 'Inviato', 'Incoming': 'In entrata', 'Outgoing': 'In uscita', 'Redirected': 'Reindirizzato', 'Missed': 'Perso', 'Answered': 'Risposto' },
			pl: { 'Call': 'Połączenie', 'SMS': 'SMS', 'Received': 'Odebrane', 'Sent': 'Wysłane', 'Incoming': 'Przychodzące', 'Outgoing': 'Wychodzące', 'Redirected': 'Przekierowane', 'Missed': 'Nieodebrane', 'Answered': 'Odebrane' },
			pt: { 'Call': 'Chamada', 'SMS': 'SMS', 'Received': 'Recebido', 'Sent': 'Enviado', 'Incoming': 'Entrada', 'Outgoing': 'Saída', 'Redirected': 'Redirecionado', 'Missed': 'Perdido', 'Answered': 'Atendido' },
			sk: { 'Call': 'Volanie', 'SMS': 'SMS', 'Received': 'Prijatá', 'Sent': 'Odoslaná', 'Incoming': 'Prichádzajúce', 'Outgoing': 'Odchozí', 'Redirected': 'Presmerované', 'Missed': 'Zmeškané', 'Answered': 'Prijaté' },
			uk: { 'Call': 'Дзвінок', 'SMS': 'SMS', 'Received': 'Отримано', 'Sent': 'Надіслано', 'Incoming': 'Вхідні', 'Outgoing': 'Вихідні', 'Redirected': 'Перенаправлено', 'Missed': 'Пропущено', 'Answered': 'Прийнято' },
			vi: { 'Call': 'Cuộc gọi', 'SMS': 'SMS', 'Received': 'Đã nhận', 'Sent': 'Đã gửi', 'Incoming': 'Đến', 'Outgoing': 'Đi', 'Redirected': 'Chuyển tiếp', 'Missed': 'Nhỡ', 'Answered': 'Đã trả lời' },
		};
		const m = map[locale] || map.en;
		return m[str] || str;
	};

	const formatPrice = (price: string | number | undefined, round = false) => {
		if (price === undefined || price === null) return '-';
		const num = typeof price === 'string' ? parseFloat(price.replace(',', '.')) : price;
		if (isNaN(num)) return String(price);
		const formatted = round ? num.toFixed(2) : num.toString();
		return `${formatted} Kč`;
	};

	const formatPriceList = (price: string | number | undefined) => formatPrice(price, true);
	const formatPriceDetail = (price: string | number | undefined) => formatPrice(price, false);

	function CallDetail({ item, lines, translate, t, balance }: { item: ActivityItem & { type: 'call' }; lines: OdorikLine[]; translate: (str: string) => string; t: (key: string) => string; balance?: { amount: string; currency: string } }) {
		const { locale } = useI18n();
		const c = item as unknown as { direction?: string; status?: string; destination_name?: string; length?: number; price?: string };
		const isMissed = c.status === 'missed';
		const isInbound = c.direction === 'in';
		const isRedirected = c.direction === 'redirected';

		const srcMatch = lookupContactOrLine(item.source_number, contacts, lines);
		const dstMatch = lookupContactOrLine(item.destination_number, contacts, lines);

		const formatDate = (date: string) => {
			const d = new Date(date);
			const pad = (n: number) => n.toString().padStart(2, '0');
			const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
			const dayOfWeek = d.toLocaleDateString(locale, { weekday: 'long' });
			return { dateStr, dayOfWeek };
		};

		const formatLine = () => {
			const lineName = lines.find(l => String(l.id) === String(item.line))?.name;
			const lineId = String(item.line);
			if (lineName) return { name: lineName, id: lineId };
			return { name: lineId, id: lineId };
		};

		const DetailRow = ({ label, value, subValue }: { label: string; value: string; subValue?: string }) => (
			<div className="flex justify-between py-2" style={{ borderBottom: '0.5px solid var(--separator)' }}>
				<span style={{ color: 'var(--text-secondary)' }}>{label}</span>
				<div className="text-right">
					<span className="font-medium block" style={{ color: 'var(--text-primary)' }}>{value}</span>
					{subValue && <span className="block text-sm" style={{ color: 'var(--text-tertiary)' }}>{subValue}</span>}
				</div>
			</div>
		);

		const DetailRowMulti = ({ label, topValue, bottomValue }: { label: string; topValue: string; bottomValue?: string }) => (
			<div className="flex justify-between py-2" style={{ borderBottom: '0.5px solid var(--separator)' }}>
				<span style={{ color: 'var(--text-secondary)' }}>{label}</span>
				<div className="text-right">
					<span className="font-medium" style={{ color: 'var(--text-primary)' }}>{topValue}</span>
					{bottomValue && <span className="block text-sm" style={{ color: 'var(--text-tertiary)' }}>{bottomValue}</span>}
				</div>
			</div>
		);

		const lineInfo = formatLine();
		const dateInfo = formatDate(item.date);

		return (
			<div className="space-y-3">
				<div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
					<div
						className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
						style={{
							backgroundColor: isMissed ? 'var(--destructive)' : isInbound ? 'var(--success)' : 'var(--accent)',
							color: 'white'
						}}
					>
						{isMissed ? (
							<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7l2.293-2.293M15 7l2.293 2.293M15 7h4"></path></svg>
						) : isInbound ? (
							<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
						) : (
							<svg className="w-6 h-6 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
						)}
					</div>
					<div className="flex-1">
						<span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{c.destination_name || translate('Call')}</span>
						<span className="block text-sm" style={{ color: isMissed ? 'var(--destructive)' : 'var(--text-secondary)' }}>
							{isMissed ? translate('Missed') : isRedirected ? translate('Redirected') : isInbound ? translate('Incoming') : translate('Outgoing')}
						</span>
					</div>
					<div className="text-right">
						<span className="font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>#{item.id}</span>
					</div>
				</div>

				<DetailRowMulti label={t('calls.from')} topValue={unifyPhoneNo(item.source_number) || '-'} bottomValue={srcMatch?.type === 'contact' ? srcMatch.contact.name : undefined} />
				<DetailRowMulti label={t('calls.to')} topValue={unifyPhoneNo(item.destination_number) || '-'} bottomValue={dstMatch?.type === 'contact' ? dstMatch.contact.name : undefined} />

				<DetailRowMulti label={t('calls.line')} topValue={lineInfo.name} bottomValue={lineInfo.id} />

				<DetailRow label={t('calls.duration')} value={formatDuration(c.length || 0)} />
				<DetailRowMulti label={t('calls.price')} topValue={formatPriceDetail(c.price)} bottomValue={balance ? `${t('balance.remaining')}: ${balance.amount} ${balance.currency}` : undefined} />
				<DetailRowMulti label={t('calls.time')} topValue={dateInfo.dateStr} bottomValue={dateInfo.dayOfWeek} />
			</div>
		);
	}

	function SmsDetail({ item, lines, t, balance }: { item: ActivityItem & { type: 'sms' }; lines: OdorikLine[]; t: (key: string) => string; balance?: { amount: string; currency: string } }) {
		const { locale } = useI18n();
		const s = item as unknown as { price?: string };

		const srcMatch = lookupContactOrLine(item.source_number, contacts, lines);
		const dstMatch = lookupContactOrLine(item.destination_number, contacts, lines);

		const formatDate = (date: string) => {
			const d = new Date(date);
			const pad = (n: number) => n.toString().padStart(2, '0');
			const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
			const dayOfWeek = d.toLocaleDateString(locale, { weekday: 'long' });
			return { dateStr, dayOfWeek };
		};

		const formatLine = () => {
			const lineName = lines.find(l => String(l.id) === String(item.line))?.name;
			const lineId = String(item.line);
			if (lineName) return { name: lineName, id: lineId };
			return { name: lineId, id: lineId };
		};

		const DetailRowMulti = ({ label, topValue, bottomValue }: { label: string; topValue: string; bottomValue?: string }) => (
			<div className="flex justify-between py-2" style={{ borderBottom: '0.5px solid var(--separator)' }}>
				<span style={{ color: 'var(--text-secondary)' }}>{label}</span>
				<div className="text-right">
					<span className="font-medium" style={{ color: 'var(--text-primary)' }}>{topValue}</span>
					{bottomValue && <span className="block text-sm" style={{ color: 'var(--text-tertiary)' }}>{bottomValue}</span>}
				</div>
			</div>
		);

		const lineInfo = formatLine();
		const dateInfo = formatDate(item.date);

		return (
			<div className="space-y-3">
				<div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
					<div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
						<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
					</div>
					<div className="flex-1">
						<span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{translate('SMS')}</span>
						<span className="block text-sm" style={{ color: 'var(--text-secondary)' }}>
							{item.source_number ? translate('Received') : translate('Sent')}
						</span>
					</div>
					<div className="text-right">
						<span className="font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>#{item.id}</span>
					</div>
				</div>

				<DetailRowMulti label="Od" topValue={unifyPhoneNo(item.source_number) || '-'} bottomValue={srcMatch?.type === 'contact' ? srcMatch.contact.name : undefined} />
				<DetailRowMulti label="Na" topValue={unifyPhoneNo(item.destination_number) || '-'} bottomValue={dstMatch?.type === 'contact' ? dstMatch.contact.name : undefined} />

				<DetailRowMulti label={t('calls.line')} topValue={lineInfo.name} bottomValue={lineInfo.id} />

				<DetailRowMulti label={t('calls.price')} topValue={formatPriceDetail(s.price)} bottomValue={balance ? `${t('balance.remaining')}: ${balance.amount} ${balance.currency}` : undefined} />
				<DetailRowMulti label={t('calls.time')} topValue={dateInfo.dateStr} bottomValue={dateInfo.dayOfWeek} />
			</div>
		);
	}

	const exportToCsv = () => {
		const headers = ['DateTime', 'Type', 'Direction', 'Source', 'Destination', 'Name', 'Contact', 'Line', 'Duration', 'Price', 'Status'];
		const rows = activity.map(item => {
			const date = new Date(item.date);
			const isoDate = date.toISOString().slice(0, 19).replace('T', ' ');
			const srcMatch = lookupContactOrLine(item.source_number, contacts, lines);
			const dstMatch = lookupContactOrLine(item.destination_number, contacts, lines);
			
			const getContactFullName = (match: typeof srcMatch) => {
				if (match?.type !== 'contact') return match?.type === 'line' ? match.line.name : '';
				const p = parseContactName(match.contact.name);
				let full = [p.name, p.surname].filter(Boolean).join(' ');
				if (p.note) full += ' - ' + p.note;
				return full;
			};
			const srcName = getContactFullName(srcMatch);
			const dstName = getContactFullName(dstMatch);
			
			// Type guards - check type first
			const isCall = 'type' in item && item.type === 'call';
			const isSms = 'type' in item && item.type === 'sms';
			
			const callItem = isCall ? item as unknown as { direction?: string; status?: string; destination_name?: string; length?: number; price?: string } : null;
			const smsItem = isSms ? item as unknown as { price?: string } : null;
			
			const direction = isSms ? (item.source_number ? translate('Received') : translate('Sent')) : 
				callItem?.direction === 'in' ? translate('Incoming') : 
				callItem?.direction === 'out' ? translate('Outgoing') : 
				callItem?.direction === 'redirected' ? translate('Redirected') : '';
			const status = isCall ? (callItem?.status === 'missed' ? translate('Missed') : translate('Answered')) : '';
			
			const destName = isCall ? callItem?.destination_name || '' : '';
			const price = callItem?.price || smsItem?.price || '';
			
			return [
				isoDate,
				isCall ? translate('Call') : translate('SMS'),
				direction,
				unifyPhoneNo(item.source_number),
				unifyPhoneNo(item.destination_number),
				destName,
				callItem?.direction === 'in' ? srcName : dstName,
				String(item.line || ''),
				isCall ? formatDuration(callItem?.length || 0) : '',
				price,
				status
			].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
		});

		const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `odorik-history-${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

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
				<h2 className="text-[34px] leading-tight font-bold tracking-tight mb-4" style={{ color: 'var(--text-primary)' }}>{t('activity.title')}</h2>
				<div className="ios-group p-4">
					<SkeletonList count={5} />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-50 text-red-600 p-5 rounded-[26px] mt-4">
				<h3 className="font-bold mb-2 text-lg">{t('common.error')}</h3>
				<p className="text-sm opacity-90">{error}</p>
			</div>
		);
	}

	return (
		<>
			<div className="mb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
				<h2 className="text-[34px] leading-tight font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('activity.title')}</h2>
				<div className="flex gap-2">
					{activity.length > 0 && (
						<button
							onClick={exportToCsv}
							className="px-4 py-2.5 ios-capsule text-sm font-medium transition-colors btn-press"
						>
							<svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							Export CSV
						</button>
					)}
				</div>
				<div className="flex gap-2">
					<select
						value={selectedType}
						onChange={(e) => onTypeChange(e.target.value as FilterType)}
						className="min-w-[120px] pl-4 pr-9 py-2.5 ios-capsule text-sm font-medium outline-none appearance-none cursor-pointer"
						style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', backgroundSize: '14px' }}
					>
						<option value="all">{t('filter.all')}</option>
						<option value="calls">{t('filter.calls')}</option>
						<option value="sms">{t('filter.sms')}</option>
					</select>
					{lines.length > 0 && (
						<select
							value={selectedLine}
							onChange={(e) => onLineChange(e.target.value)}
							className="min-w-[120px] pl-4 pr-9 py-2.5 ios-capsule text-sm font-medium outline-none appearance-none cursor-pointer"
							style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', backgroundSize: '14px' }}
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
						className="ios-search"
					/>
				</div>
			)}

			<div className="ios-group ios-rows mb-6" style={{ '--row-inset': '68px' } as React.CSSProperties}>
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
							<div
								key={`call-${c.id}`}
								onClick={() => setSelectedItem(c)}
								className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors cursor-pointer hover:opacity-80 ios-pressable"
							>
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
										<span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{formatPriceList(c.price)}</span>
									</div>
								</div>
							</div>
						);
					} else {
						// SMS item
						const s = item; // OdorikSMS & { type: 'sms' }
						return (
							<div
								key={`sms-${s.id}`}
								onClick={() => setSelectedItem(s)}
								className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors cursor-pointer hover:opacity-80 ios-pressable"
							>
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
										<span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatPriceList(s.price)}</span>
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
					className="w-full py-3.5 rounded-full font-semibold transition-all disabled:opacity-50 mb-10"
					style={{ backgroundColor: 'var(--surface)', color: 'var(--accent)' }}
				>
					{loadingMore ? t('common.loading') : t('activity.load_more')}
				</button>
			)}
		{selectedItem && createPortal(
			<div
				className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-2 md:p-4 pb-[max(env(safe-area-inset-bottom),8px)]"
				style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
				onClick={() => setSelectedItem(null)}
			>
				<div
					className="rounded-[34px] w-full max-w-md max-h-[80vh] overflow-hidden"
					style={{ backgroundColor: 'var(--surface)' }}
					onClick={(e) => e.stopPropagation()}
				>
					<div className="px-5 pt-5 pb-2 flex justify-between items-center">
						<h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
							{selectedItem.type === 'call' ? (selectedItem as unknown as { destination_name?: string }).destination_name || translate('Call') : translate('SMS')}
						</h3>
						<button
							onClick={() => setSelectedItem(null)}
							className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
							style={{ backgroundColor: 'var(--fill)', color: 'var(--text-secondary)' }}
						>
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
					<div className="px-5 pb-5 pt-2 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
						{selectedItem.type === 'call' ? (
							<CallDetail item={selectedItem} lines={lines} translate={translate} t={t} balance={balance} />
						) : (
							<SmsDetail item={selectedItem} lines={lines} t={t} balance={balance} />
						)}
					</div>
				</div>
			</div>,
			document.body
		)}
		</>
	);
}
