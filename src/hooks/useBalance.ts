import { useState, useEffect, useCallback } from 'react';
import { fetchBalance, readCache, writeCache, isCacheStale, isOffline, getBalanceCacheKey, CACHE_TTL_10_MIN } from '../api';
import type { OdorikCredentials } from '../api';

interface UseBalanceOptions {
	autoRefresh?: boolean;
	refreshInterval?: number;
}

export function useBalance(creds: OdorikCredentials | null, options: UseBalanceOptions = {}) {
	const { autoRefresh = true, refreshInterval = CACHE_TTL_10_MIN } = options;

	const [balance, setBalance] = useState<string>('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async (force = false) => {
		if (!creds) return;

		const cacheKey = getBalanceCacheKey(creds);
		const cached = await readCache<string>(cacheKey);

		if (isOffline()) {
			if (cached) setBalance(cached.data);
			return;
		}

		if (!force && !isCacheStale(cached, CACHE_TTL_10_MIN)) {
			if (cached) setBalance(cached.data);
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const b = await fetchBalance(creds);
			setBalance(b);
			await writeCache(cacheKey, b);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to fetch balance');
			if (cached) setBalance(cached.data);
		} finally {
			setLoading(false);
		}
	}, [creds]);

	useEffect(() => {
		if (!creds) return;

		const loadCache = async () => {
			const cachedBalance = await readCache<string>(getBalanceCacheKey(creds));
			if (cachedBalance) setBalance(cachedBalance.data);
		};
		loadCache();

		refresh();

		if (!autoRefresh) return;
		const interval = setInterval(() => refresh(), refreshInterval);

		return () => clearInterval(interval);
	}, [creds, autoRefresh, refreshInterval, refresh]);

	return { balance, loading, error, refresh };
}