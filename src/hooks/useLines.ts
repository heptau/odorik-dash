import { useState, useEffect, useCallback } from 'react';
import { fetchLines, readCache, writeCache, getLinesCacheKey, isCacheStale, isOffline, CACHE_TTL_1_DAY } from '../api';
import type { OdorikLine, OdorikCredentials } from '../api';

type LinesCache = { lines: OdorikLine[]; ts: number };

export function useLines(creds: OdorikCredentials | null) {
	const [lines, setLines] = useState<OdorikLine[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async (showSpinner = true) => {
		if (!creds) return;
		if (isOffline()) return;

		if (showSpinner) setLoading(true);
		setError(null);

		try {
			const data = await fetchLines(creds);
			setLines(data);
			const ts = Date.now();
			await writeCache(getLinesCacheKey(creds), { lines: data, ts });
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load lines');
		} finally {
			if (showSpinner) setLoading(false);
		}
	}, [creds]);

	useEffect(() => {
		if (!creds) return;

		const loadCache = async () => {
			const cached = await readCache<LinesCache>(getLinesCacheKey(creds));
			if (cached?.data?.lines) {
				setLines(cached.data.lines);
				setLoading(false);

				if (isCacheStale(cached, CACHE_TTL_1_DAY) && !isOffline()) {
					load(false);
				}
			} else {
				load(true);
			}
		};
		loadCache();
	}, [creds, load]);

	return { lines, loading, error, reload: () => load(true) };
}