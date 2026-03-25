import { useState, useEffect, useCallback } from 'react';
import { fetchSMS, loadFromCache, saveToCache, getCacheKey } from '../api';
import type { OdorikSMS, OdorikCredentials } from '../api';

export function useSMS(creds: OdorikCredentials | null) {
	const [sms, setSms] = useState<OdorikSMS[]>([]);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const cacheKey = creds ? getCacheKey(creds, 'sms') : '';

	const loadInitial = useCallback(async () => {
		if (!creds) return;

		setLoading(true);
		setError(null);

		try {
			const d = new Date();
			d.setDate(d.getDate() - 30);
			const data = await fetchSMS(creds, d.toISOString(), new Date().toISOString());
			const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
			setSms(sorted);
			if (cacheKey) saveToCache(cacheKey, sorted);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load SMS');
		} finally {
			setLoading(false);
		}
	}, [creds, cacheKey]);

	const syncNewData = useCallback(async () => {
		if (!creds || sms.length === 0) return;

		setRefreshing(true);
		try {
			const latestSms = sms.reduce((max, s) =>
				new Date(s.date) > new Date(max.date) ? s : max, sms[0]);

			const fromDate = new Date(latestSms.date);
			fromDate.setSeconds(fromDate.getSeconds() + 1);
			const toDate = new Date();

			if (fromDate >= toDate) return;

			const newData = await fetchSMS(creds, fromDate.toISOString(), toDate.toISOString());
			if (newData.length > 0) {
				const merged = [...newData, ...sms];
				const unique = Array.from(new Map(merged.map(s => [s.id, s])).values());
				const sorted = unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
				setSms(sorted);
				if (cacheKey) saveToCache(cacheKey, sorted);
			}
		} catch (err) {
			console.error('Failed to sync SMS', err);
		} finally {
			setRefreshing(false);
		}
	}, [creds, sms, cacheKey]);

	const loadMore = useCallback(async () => {
		if (!creds || sms.length === 0 || loading) return;

		setLoading(true);
		try {
			const oldestSms = sms[sms.length - 1];
			const toDate = new Date(oldestSms.date);
			toDate.setSeconds(toDate.getSeconds() - 1);

			const fromDate = new Date(toDate);
			fromDate.setDate(fromDate.getDate() - 60);

			const moreData = await fetchSMS(creds, fromDate.toISOString(), toDate.toISOString());
			if (moreData.length > 0) {
				const merged = [...sms, ...moreData];
				const unique = Array.from(new Map(merged.map(s => [s.id, s])).values());
				const sorted = unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
				setSms(sorted);
				if (cacheKey) saveToCache(cacheKey, sorted);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load more SMS');
		} finally {
			setLoading(false);
		}
	}, [creds, sms, loading, cacheKey]);

	useEffect(() => {
		if (!creds) return;

		const loadCache = async () => {
			const cached = await loadFromCache<OdorikSMS>(cacheKey);
			if (cached.length > 0) {
				setSms(cached);
				syncNewData();
			} else {
				loadInitial();
			}
		};
		loadCache();
	}, [creds]);

	return {
		sms,
		loading,
		refreshing,
		error,
		loadInitial,
		syncNewData,
		loadMore,
	};
}