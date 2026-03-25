import { useState, useEffect, useCallback } from 'react';
import { fetchCalls, fetchCallsAndSMS, loadFromCache, saveToCache, getCacheKey } from '../api';
import type { OdorikCall, OdorikCredentials } from '../api';

export function useCalls(creds: OdorikCredentials | null) {
	const [calls, setCalls] = useState<OdorikCall[]>([]);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const cacheKey = creds ? getCacheKey(creds, 'calls') : '';

	const loadInitial = useCallback(async () => {
		if (!creds) return;

		setLoading(true);
		setError(null);

		try {
			const d = new Date();
			d.setDate(d.getDate() - 30);
			const data = await fetchCalls(creds, d.toISOString(), new Date().toISOString());
			const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
			setCalls(sorted);
			if (cacheKey) saveToCache(cacheKey, sorted);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load calls');
		} finally {
			setLoading(false);
		}
	}, [creds, cacheKey]);

	const syncNewData = useCallback(async () => {
		if (!creds || calls.length === 0) return;

		setRefreshing(true);
		try {
			const latestCall = calls.reduce((max, c) =>
				new Date(c.date) > new Date(max.date) ? c : max, calls[0]);

			const fromDate = new Date(latestCall.date);
			fromDate.setSeconds(fromDate.getSeconds() + 1);
			const toDate = new Date();

			if (fromDate >= toDate) return;

			const newData = await fetchCalls(creds, fromDate.toISOString(), toDate.toISOString());
			if (newData.length > 0) {
				const merged = [...newData, ...calls];
				const unique = Array.from(new Map(merged.map(c => [c.id, c])).values());
				const sorted = unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
				setCalls(sorted);
				if (cacheKey) saveToCache(cacheKey, sorted);
			}
		} catch (err) {
			console.error('Failed to sync calls', err);
		} finally {
			setRefreshing(false);
		}
	}, [creds, calls, cacheKey]);

	const loadMore = useCallback(async () => {
		if (!creds || calls.length === 0 || loading) return;

		setLoading(true);
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
				if (cacheKey) saveToCache(cacheKey, sorted);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load more calls');
		} finally {
			setLoading(false);
		}
	}, [creds, calls, loading, cacheKey]);

	const prefetch = useCallback(async () => {
		if (!creds) return;
		const now = new Date();
		const from30d = new Date(now);
		from30d.setDate(from30d.getDate() - 30);
		await fetchCallsAndSMS(creds, from30d.toISOString(), now.toISOString());
	}, [creds]);

	useEffect(() => {
		if (!creds) return;

		const loadCache = async () => {
			const cached = await loadFromCache<OdorikCall>(cacheKey);
			if (cached.length > 0) {
				setCalls(cached);
				syncNewData();
			} else {
				loadInitial();
			}
		};
		loadCache();
	}, [creds]);

	return {
		calls,
		loading,
		refreshing,
		error,
		loadInitial,
		syncNewData,
		loadMore,
		prefetch,
	};
}