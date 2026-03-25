import { useState, useEffect, useMemo } from 'react';
import { loadFromCache, readCache, getCacheKey, getLinesCacheKey, type ActivityItem, type OdorikLine } from '../api';
import type { OdorikCredentials } from '../api';
import { useT } from '../i18n';

type LinesCache = { lines: OdorikLine[]; ts: number };

interface StatsCardProps {
	title: string;
	value: string;
	subtitle?: string;
	icon: string;
	color?: string;
}

function StatsCard({ title, value, subtitle, icon, color = 'blue' }: StatsCardProps) {
	const colors: Record<string, { bg: string; text: string }> = {
		blue: { bg: 'var(--bg-secondary)', text: 'var(--accent)' },
		green: { bg: 'var(--bg-secondary)', text: 'var(--success)' },
		orange: { bg: 'var(--bg-secondary)', text: '#f97316' },
		purple: { bg: 'var(--bg-secondary)', text: '#a855f7' },
	};

	return (
		<div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px' }}>
			<div className="flex items-center gap-3 mb-2">
				<div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: colors[color].bg, color: colors[color].text }}>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon}></path></svg>
				</div>
				<span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{title}</span>
			</div>
			<div className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{value}</div>
			{subtitle && <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</div>}
		</div>
	);
}

export default function Statistics({ creds }: { creds: OdorikCredentials }) {
	const cacheKey = getCacheKey(creds, 'activity');
	const linesCacheKey = getLinesCacheKey(creds);
	const [activity, setActivity] = useState<ActivityItem[]>([]);
	const [lines, setLines] = useState<OdorikLine[]>([]);
	const t = useT();

	useEffect(() => {
		const loadCache = async () => {
			const cached = await loadFromCache<ActivityItem>(cacheKey);
			setActivity(cached);

			const linesCached = await readCache<LinesCache>(linesCacheKey);
			if (linesCached?.data?.lines) {
				setLines(linesCached.data.lines);
			}
		};
		loadCache();
	}, [creds]);

	const stats = useMemo(() => {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const monthCalls = activity.filter(item => item.type === 'call' && new Date(item.date) >= startOfMonth);
		const monthSms = activity.filter(item => item.type === 'sms' && new Date(item.date) >= startOfMonth);

		const totalCalls = monthCalls.length;
		const missedCalls = monthCalls.filter(c => c.type === 'call' && c.status === 'missed').length;
		const totalMinutes = monthCalls.reduce((sum, c) => sum + (c.type === 'call' ? c.length || 0 : 0), 0);
		const totalPrice = monthCalls.reduce((sum, c) => sum + (c.type === 'call' ? parseFloat(c.price || '0') : 0), 0);
		const totalSms = monthSms.length;
		const totalSmsPrice = monthSms.reduce((sum, s) => sum + (s.type === 'sms' ? parseFloat(s.price || '0') : 0), 0);

		const callsByLine = monthCalls.reduce((acc, c) => {
			const line = c.type === 'call' ? c.line.toString() : '0';
			acc[line] = (acc[line] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		const topLines = Object.entries(callsByLine)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3);

		return {
			totalCalls,
			missedCalls,
			totalMinutes,
			totalPrice,
			totalSms,
			totalSmsPrice,
			topLines,
		};
	}, [activity, lines]);

	const formatDuration = (sec: number) => {
		if (!sec) return '0 m';
		const m = Math.floor(sec / 60);
		if (m < 60) return `${m} m`;
		const h = Math.floor(m / 60);
		const remainingM = m % 60;
		return `${h}h ${remainingM}m`;
	};

	return (
		<div className="mb-4">
			<h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t('statistics.title')}</h2>
			<p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{t('statistics.this_month')}</p>

			<div className="grid grid-cols-2 gap-3 mb-6">
				<StatsCard
					title={t('statistics.calls')}
					value={stats.totalCalls.toString()}
					subtitle={`${stats.missedCalls} ${t('statistics.missed')}`}
					icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
					color="blue"
				/>
				<StatsCard
					title={t('statistics.minutes')}
					value={formatDuration(stats.totalMinutes)}
					subtitle={`${stats.totalPrice.toFixed(2)} Kč`}
					icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
					color="green"
				/>
				<StatsCard
					title={t('statistics.sms')}
					value={stats.totalSms.toString()}
					subtitle={`${stats.totalSmsPrice.toFixed(2)} Kč`}
					icon="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
					color="orange"
				/>
				<StatsCard
					title={t('statistics.success_rate')}
					value={stats.totalCalls > 0 ? `${Math.round((1 - stats.missedCalls / stats.totalCalls) * 100)}%` : '-'}
					subtitle={stats.missedCalls > 0 ? `${stats.missedCalls} ${t('statistics.missed')}` : t('statistics.all_handled')}
					icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					color="purple"
				/>
			</div>

			{stats.topLines.length > 0 && (
				<div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px' }}>
					<h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t('statistics.top_lines')}</h3>
					<div className="space-y-3">
						{stats.topLines.map(([lineId, count]) => {
							const line = lines.find(l => String(l.id) === String(lineId));
							return (
								<div key={lineId} className="flex items-center justify-between py-2" style={{ borderBottomColor: 'var(--separator)', borderBottomWidth: '1px', borderBottomStyle: 'solid' }}>
									<div className="flex items-center gap-3 min-w-0">
										<span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
											{count}
										</span>
										<span className="text-base font-medium truncate" style={{ color: 'var(--text-primary)' }}>{line?.name || lineId} <span style={{ color: 'var(--text-tertiary)' }}>({lineId})</span></span>
									</div>
									<span className="text-sm font-semibold shrink-0 ml-3" style={{ color: 'var(--text-secondary)' }}>{count} {t('statistics.calls')}</span>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{activity.length === 0 && (
				<div className="p-8 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--separator)', borderWidth: '1px', color: 'var(--text-secondary)' }}>
					<p>{t('statistics.no_data')}</p>
				</div>
			)}
		</div>
	);
}