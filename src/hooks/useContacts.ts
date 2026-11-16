import { useState, useEffect, useCallback } from 'react';
import { fetchContacts, addContact, editContact, deleteContact, readCache, writeCache, isCacheStale, isOffline, getCacheTTL } from '../api';
import type { Contact, OdorikCredentials } from '../api';

const AUTH_ERROR_PATTERNS = ['401', 'unauthorized', 'přihlášení', 'login', 'neplatné', 'invalid', 'auth'];

function isAuthError(message: string): boolean {
	const lower = message.toLowerCase();
	return AUTH_ERROR_PATTERNS.some(p => lower.includes(p));
}

const getContactsCacheKey = (creds: OdorikCredentials) => `contacts_${creds.user}`;

// Older versions stored the contacts wrapped once more as `{ data, timestamp }`;
// accept both shapes so such entries don't end up in state as a non-array.
function unwrapCachedContacts(data: unknown): Contact[] | null {
	if (Array.isArray(data)) return data as Contact[];
	const inner = (data as { data?: unknown } | null)?.data;
	return Array.isArray(inner) ? (inner as Contact[]) : null;
}

export function useContacts(creds: OdorikCredentials | null, onAuthError?: () => void) {
	const [contacts, setContacts] = useState<Contact[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (!creds) return;

		setLoading(true);
		setError(null);

		const cacheKey = getContactsCacheKey(creds);
		
		try {
			const cached = await readCache<unknown>(cacheKey);
			const cachedContacts = cached ? unwrapCachedContacts(cached.data) : null;
			
			// Use cache if valid and not forcing refresh
			if (cached && cachedContacts && !isCacheStale(cached, getCacheTTL('contacts'))) {
				setContacts(cachedContacts);
				setLoading(false);
				
				// Background refresh if online
				if (!isOffline()) {
					fetchContacts(creds).then(data => {
						writeCache(cacheKey, data);
						setContacts(data);
					}).catch(() => {});
				}
				return;
			}
			
			// Fetch fresh data
			const data = await fetchContacts(creds);
			await writeCache(cacheKey, data);
			setContacts(data);
		} catch (err) {
			// Try to use stale cache on error
			const cached = await readCache<unknown>(cacheKey);
			const cachedContacts = cached ? unwrapCachedContacts(cached.data) : null;
			if (cachedContacts) {
				setContacts(cachedContacts);
			} else {
				const message = err instanceof Error ? err.message : 'Failed to load contacts';
				setError(message);
				if (isAuthError(message)) onAuthError?.();
			}
		} finally {
			setLoading(false);
		}
	}, [creds, onAuthError]);

	const add = useCallback(async (contact: Partial<Contact>) => {
		if (!creds) return;
		await addContact(creds, contact);
		await load();
	}, [creds, load]);

	const edit = useCallback(async (oldShortcut: number, contact: Contact) => {
		if (!creds) return;
		await editContact(creds, oldShortcut, contact);
		await load();
	}, [creds, load]);

	const remove = useCallback(async (shortcut: number) => {
		if (!creds) return;
		await deleteContact(creds, shortcut);
		await load();
	}, [creds, load]);

	useEffect(() => {
		load();
	}, [load]);

	return { contacts, loading, error, reload: load, add, edit, remove };
}