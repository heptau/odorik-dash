import { useState, useEffect, useCallback } from 'react';
import { fetchContacts, addContact, editContact, deleteContact } from '../api';
import type { Contact, OdorikCredentials } from '../api';

const AUTH_ERROR_PATTERNS = ['401', 'unauthorized', 'přihlášení', 'login', 'neplatné', 'invalid', 'auth'];

function isAuthError(message: string): boolean {
	const lower = message.toLowerCase();
	return AUTH_ERROR_PATTERNS.some(p => lower.includes(p));
}

export function useContacts(creds: OdorikCredentials | null, onAuthError?: () => void) {
	const [contacts, setContacts] = useState<Contact[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (!creds) return;

		setLoading(true);
		setError(null);

		try {
			const data = await fetchContacts(creds);
			setContacts(data);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to load contacts';
			setError(message);
			if (isAuthError(message)) onAuthError?.();
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