import { useState, useEffect, useCallback } from 'react';
import { fetchContacts, addContact, editContact, deleteContact, readCache, writeCache, isCacheStale, isOffline, getCacheTTL } from '../api';
import type { Contact, OdorikCredentials } from '../api';

const AUTH_ERROR_PATTERNS = ['401', 'unauthorized', 'přihlášení', 'login', 'neplatné', 'invalid', 'auth'];

function isAuthError(message: string): boolean {
	const lower = message.toLowerCase();
	return AUTH_ERROR_PATTERNS.some(p => lower.includes(p));
}

const getContactsCacheKey = (creds: OdorikCredentials) => `contacts_${creds.user}`;

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
			const cached = await readCache<Contact[]>(cacheKey);
			
			// Use cache if valid and not forcing refresh
			if (cached && !isCacheStale(cached, getCacheTTL('contacts'))) {
				setContacts(cached.data);
				setLoading(false);
				
				// Background refresh if online
				if (!isOffline()) {
					fetchContacts(creds).then(data => {
						writeCache(cacheKey, { data, timestamp: Date.now() });
						setContacts(data);
					}).catch(() => {});
				}
				return;
			}
			
			// Fetch fresh data
			const data = await fetchContacts(creds);
			await writeCache(cacheKey, { data, timestamp: Date.now() });
			setContacts(data);
		} catch (err) {
			// Try to use stale cache on error
			const cached = await readCache<Contact[]>(cacheKey);
			if (cached?.data) {
				setContacts(cached.data);
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