import { useState, useEffect, useCallback } from 'react';
import { fetchCallsAndSMS, loadFromCache, saveToCache, getCacheKey } from '../api';
import type { OdorikCredentials, ActivityItem } from '../api';

export type FilterType = 'all' | 'calls' | 'sms';

export function useActivity(creds: OdorikCredentials | null) {
	const [activity, setActivity] = useState<ActivityItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedType, setSelectedType] = useState<FilterType>('all');
	const [selectedLine, setSelectedLine] = useState<string>('');

	const cacheKey = creds ? getCacheKey(creds, 'activity') : '';

	const loadInitial = useCallback(async () => {
		if (!creds) return;
		setLoading(true);
		setError(null);
		try {
			const d = new Date();
			d.setDate(d.getDate() - 30);
			const fromDate = d.toISOString();
			const toDate = new Date().toISOString();

			const { activity: act } = await fetchCallsAndSMS(creds, fromDate, toDate);
			setActivity(act);
			if (cacheKey) saveToCache(cacheKey, act);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load activity');
		} finally {
			setLoading(false);
		}
	}, [creds, cacheKey]);

	const loadMore = useCallback(async () => {
		if (!creds || activity.length === 0 || loadingMore) return;
		setLoadingMore(true);
		try {
			const oldestItem = activity[activity.length - 1];
			const toDate = new Date(oldestItem.date);
			toDate.setSeconds(toDate.getSeconds() - 1);

			const fromDate = new Date(toDate);
			fromDate.setDate(fromDate.getDate() - 60);

			const { activity: more } = await fetchCallsAndSMS(creds, fromDate.toISOString(), toDate.toISOString());
			if (more.length > 0) {
				const merged = [...activity, ...more];
				const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
				const sorted = unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
				setActivity(sorted);
				if (cacheKey) saveToCache(cacheKey, sorted);
			}
		} catch (err) {
			console.error('Failed to load more activity', err);
		} finally {
			setLoadingMore(false);
		}
	}, [creds, activity, loadingMore, cacheKey]);

	useEffect(() => {
		if (!creds) return;

		const loadCache = async () => {
			const cached = await loadFromCache<ActivityItem>(cacheKey);
			if (cached.length > 0) {
				setActivity(cached);
				setLoading(false);
				// Sync new data in background - fetch from newest cached item to now
				const newestItem = cached[0];
				const fromDate = new Date(newestItem.date).toISOString();
				const toDate = new Date().toISOString();
				fetchCallsAndSMS(creds, fromDate, toDate).then(({ activity: act }) => {
					if (act.length > 0) {
						const merged = [...act, ...cached];
						const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
						const sorted = unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
						setActivity(sorted);
						if (cacheKey) saveToCache(cacheKey, sorted);
					}
				}).catch(err => console.error('Failed to sync activity', err));
			} else {
				loadInitial();
			}
		};
		loadCache();
	}, [creds]);

	return {
		activity,
		loading,
		loadingMore,
		error,
		selectedType,
		setSelectedType,
		selectedLine,
		setSelectedLine,
		loadInitial,
		loadMore,
	};
}

	
