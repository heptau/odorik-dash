import { useState, useEffect, useCallback } from 'react';
import { fetchContacts, addContact, editContact, deleteContact } from '../api';
import type { Contact, OdorikCredentials } from '../api';

export function useContacts(creds: OdorikCredentials | null) {
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
			setError(err instanceof Error ? err.message : 'Failed to load contacts');
		} finally {
			setLoading(false);
		}
	}, [creds]);

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