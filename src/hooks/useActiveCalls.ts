import { useState, useEffect, useCallback } from 'react';
import { fetchActiveCalls, terminateCall, isOffline } from '../api';
import type { OdorikCredentials, OdorikActiveCall } from '../api';

export function useActiveCalls(creds: OdorikCredentials | null) {
	const [calls, setCalls] = useState<OdorikActiveCall[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasActive, setHasActive] = useState(false);

	const refresh = useCallback(async () => {
		if (!creds) return;

		if (isOffline()) return;

		setLoading(true);
		setError(null);
		try {
			const data = await fetchActiveCalls(creds);
			setCalls(data);
			setHasActive(data.length > 0);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to fetch active calls');
		} finally {
			setLoading(false);
		}
	}, [creds]);

	const hangup = useCallback(
		async (callId: number) => {
			if (!creds) return;
			try {
				await terminateCall(creds, callId);
				await refresh();
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to terminate call');
			}
		},
		[creds, refresh],
	);

	useEffect(() => {
		if (!creds) return;

		refresh();
		const interval = setInterval(() => refresh(), 5000);

		return () => clearInterval(interval);
	}, [creds, refresh]);

	return { calls, loading, error, hasActive, refresh, hangup };
}
