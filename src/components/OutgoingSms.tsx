import { useState, useEffect, useMemo } from 'react';
import { fetchSMS, unifyPhoneNo, lookupContact, parseContactName } from '../api';
import type { OdorikSMS, OdorikCredentials, Contact } from '../api';
import { SkeletonList } from './Skeleton';
import { useT } from '../i18n';

export default function OutgoingSms({ creds, contacts = [] }: { creds: OdorikCredentials; contacts?: Contact[] }) {
	const [sms, setSms] = useState<OdorikSMS[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [search, setSearch] = useState('');
	const t = useT();

	const loadInitial = async () => {
		setLoading(true);
		setError('');
		try {
			const d = new Date();
			d.setDate(d.getDate() - 30);
			const data = await fetchSMS(creds, d.toISOString(), new Date().toISOString());
			const outgoing = data.filter(s => s.destination_number);
			const sorted = outgoing.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
			setSms(sorted);
		} catch (err) {
			setError(err instanceof Error ? err.message : t('sms.error_loading'));
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadInitial();
	}, [creds]);

	const filteredSms = useMemo(() => {
		if (!search.trim()) return sms;
		const q = search.toLowerCase();
		return sms.filter(s => {
			const contact = lookupContact(s.destination_number, contacts);
			return (
				s.source_number.includes(q) ||
				s.destination_number.includes(q) ||
				(contact && contact.name.toLowerCase().includes(q))
			);
		});
	}, [sms, contacts, search]);

	if (loading) {
		return (
			<div className="mb-4">
				<h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('sms.sent_title')}</h2>
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
			<div className="mb-4 flex justify-between items-center">
<h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('sms.sent_title')}</h2>
			<div className="text-sm font-medium bg-white px-3 py-1.5 rounded-lg border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', color: 'var(--text-secondary)' }}>
					{search ? `${filteredSms.length} / ` : ''}{sms.length} {t('sms.messages')}
				</div>
			</div>

			{sms.length > 0 && (
				<div className="mb-4">
					<input
						type="search"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder={t('sms.search')}
						className="w-full px-4 py-2.5 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
						style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', color: 'var(--text-primary)' }}
					/>
				</div>
			)}

<div className="rounded-2xl shadow-sm divide-y overflow-hidden mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px', borderStyle: 'solid' }}>
			{filteredSms.length === 0 ? (
				<div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
						{search ? t('sms.no_results') : t('sms.empty_sent')}
					</div>
				) : filteredSms.map((s) => {
					const contact = lookupContact(s.destination_number, contacts);
					const parsed = contact ? parseContactName(contact.name) : null;

					return (
						<div key={s.id} className="p-4 transition-colors" style={{ borderBottomColor: 'var(--separator)', borderBottomWidth: '1px', borderBottomStyle: 'solid' }}>
							<div className="flex items-start gap-3">
								<div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
									<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between">
										<span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
											{parsed ? parsed.displayName : unifyPhoneNo(s.destination_number)}
										</span>
										<span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
											{new Date(s.date).toLocaleString('cs-CZ')}
										</span>
									</div>
									<span className="text-sm block truncate" style={{ color: 'var(--text-secondary)' }}>
										{unifyPhoneNo(s.destination_number)}
									</span>
								</div>
								<div className="text-right shrink-0">
									<span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.price} Kč</span>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{sms.length > 0 && (
				<button
					onClick={loadInitial}
					disabled={loading}
					className="w-full py-4 border rounded-2xl font-semibold transition-all disabled:opacity-50 mb-10 shadow-sm"
					style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', color: 'var(--text-secondary)' }}
				>
					{loading ? t('common.loading') : t('sms.refresh')}
				</button>
			)}
		</>
	);
}