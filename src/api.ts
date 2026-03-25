export interface Contact {
  shortcut: number;
  number: string;
  name: string;
}

export interface OdorikLine {
  id: string;
  name: string;
  caller_id?: string;
}

export interface LineMatch {
  type: 'line';
  line: OdorikLine;
}

export interface ContactMatch {
  type: 'contact';
  contact: Contact;
}

export type ContactOrLineMatch = ContactMatch | LineMatch;

export interface OdorikCredentials {
  user: string;
  pass: string;
}

const CREDENTIALS_KEY = 'odorik_credentials';

interface RetryOptions {
  retries?: number;
  delay?: number;
}

async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 3, delay = 1000 } = options;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`Retry ${attempt}/${retries} after error:`, err);
      await new Promise(r => setTimeout(r, delay * attempt));
    }
  }
  throw new Error('Retry exhausted');
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const rawKey = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('odorik-dash-v1-salt'));
  return crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export const loadCredentials = async (): Promise<OdorikCredentials | null> => {
  const encrypted = localStorage.getItem(CREDENTIALS_KEY);
  if (!encrypted) return null;

  try {
    const key = await getEncryptionKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(12) },
      key,
      JSON.parse(atob(encrypted))
    );
    const { user, pass } = JSON.parse(new TextDecoder().decode(decrypted));
    return user && pass ? { user, pass } : null;
  } catch {
    localStorage.removeItem(CREDENTIALS_KEY);
    return null;
  }
};

export const saveCredentials = async (creds: OdorikCredentials): Promise<void> => {
  const key = await getEncryptionKey();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(12) },
    key,
    new TextEncoder().encode(JSON.stringify(creds))
  );
  localStorage.setItem(CREDENTIALS_KEY, btoa(JSON.stringify(Array.from(new Uint8Array(encrypted)))));
};

export const clearCredentials = (): void => {
  localStorage.removeItem(CREDENTIALS_KEY);
};

export const fetchContacts = async (creds: OdorikCredentials, options?: RetryOptions): Promise<Contact[]> => {
  return withRetry(async () => {
    const url = new URL('https://www.odorik.cz/api/v1/speed_dials.json');
    url.searchParams.append('user', creds.user);
    url.searchParams.append('password', creds.pass);

    const response = await fetch(url.toString(), {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch contacts');
    }

    const data = await response.json();
    if (data.errors) {
      throw new Error(data.errors[0]);
    }

    return data as Contact[];
  }, options);
};

export type PhoneComponents = {
	prefix: string;   // e.g. "+420", "+1", ""
	number: string;   // remaining local number
};

const PHONE_REGEX = /^(\+|00)(2[1-69]\d|3[578]\d|42\d|5[09]\d|6[7-9]\d|8[0578]\d|9[679]\d|[2-689]\d|[17])(.*)/;

// Returns split components — use when you need prefix and number separately
export const splitPhoneNo = (raw: string): PhoneComponents => {
	if (!raw) return { prefix: '', number: '' };

	const normalized = raw.trim().replace(/\s+/g, ' ');
	const match = normalized.match(PHONE_REGEX);

	if (!match) return { prefix: '', number: normalized };

	return {
		prefix: '+' + match[2],
		number: match[3].trim(),
	};
};

// Returns formatted string — drop-in replacement for the original unifyPhoneNo
export const unifyPhoneNo = (raw: string): string => {
	if (!raw) return '';

	const { prefix, number } = splitPhoneNo(raw);

	if (!prefix) return raw.trim();

	return prefix + ' ' + number;
};

// Parsed representation of an Odorik contact name.
// Odorik stores names as: "First <b>Last</b> <i>note</i>"
export interface ParsedContactName {
	name: string;
	surname: string;
	note: string;
	/** Combined "First Last" for display as primary label */
	displayName: string;
}

// Parse contact name components from Odorik's HTML-like format:
// "Jan <b>Novak</b> <i>poznamka</i>" -> { name: "Jan", surname: "Novak", note: "poznamka", displayName: "Jan Novak" }
export const parseContactName = (fullname: string): ParsedContactName => {
	const nameMatch = fullname.match(/^([^<]*)/);
	const surnameMatch = fullname.match(/<b>(.*?)<\/b>/);
	const noteMatch = fullname.match(/<i>(.*?)<\/i>/);
	const name = nameMatch ? nameMatch[1].trim() : '';
	const surname = surnameMatch ? surnameMatch[1] : '';
	const note = noteMatch ? noteMatch[1] : '';
	const displayName = [name, surname].filter(Boolean).join(' ');
	return { name, surname, note, displayName };
};

// Strip all non-digit characters, then compare last 9 digits for phone number lookup.
// Handles prefix differences: "+420777123456", "00420777123456", "777123456" all match.
const normalizePhone = (phone: string): string => phone.replace(/\D/g, '');

export const isInternalPhone = (phone: string): boolean => phone.startsWith('*') || phone.startsWith('#');

export const lookupContactOrLine = (phone: string, contacts: Contact[], lines: OdorikLine[]): ContactOrLineMatch | undefined => {
	const norm = normalizePhone(phone);
	if (norm.length < 4) return undefined;

	if (isInternalPhone(phone)) {
		const line = lines.find(l => l.caller_id && normalizePhone(l.caller_id) === norm);
		if (line) return { type: 'line', line };
	}

	const contact = contacts.find(c => {
		const cn = normalizePhone(c.number);
		if (!cn) return false;
		if (cn === norm) return true;
		const minLen = Math.min(cn.length, norm.length);
		if (minLen >= 9) {
			return cn.slice(-9) === norm.slice(-9);
		}
		return false;
	});

	if (contact) return { type: 'contact', contact };
	return undefined;
};

export const lookupLineByNumber = (phone: string, lines: OdorikLine[]): OdorikLine | undefined => {
	const norm = normalizePhone(phone);
	if (norm.length < 4) return undefined;
	return lines.find(l => l.caller_id && normalizePhone(l.caller_id) === norm);
};

export const lookupLineById = (lineId: string | number, lines: OdorikLine[]): OdorikLine | undefined => {
	return lines.find(l => l.id === String(lineId));
};

/**
 * Find a contact matching the given phone number.
 * @deprecated Use lookupContactOrLine instead for full functionality.
 */
export const lookupContact = (phone: string, contacts: Contact[]): Contact | undefined => {
	const result = lookupContactOrLine(phone, contacts, []);
	if (result?.type === 'contact') return result.contact;
	return undefined;
};

/**
 * Fetch calls and SMS in a single API request using include_sms=true.
 * The combined response is a mixed array — SMS records lack `direction`,
 * `length` and `status`, so we use presence of `direction` to split them.
 *
 * Returns:
 *   calls    — plain OdorikCall array (for the Calls tab cache)
 *   sms      — plain OdorikSMS array (for the SMS tab cache)
 *   activity — unified ActivityItem array sorted by date descending
 *              (for the combined activity cache, ready for a future feed view)
 */
export const fetchCallsAndSMS = async (
	creds: OdorikCredentials,
	from: string,
	to: string,
): Promise<{ calls: OdorikCall[]; sms: OdorikSMS[]; activity: ActivityItem[] }> => {
	const url = new URL('https://www.odorik.cz/api/v1/calls.json');
	url.searchParams.append('user', creds.user);
	url.searchParams.append('password', creds.pass);
	url.searchParams.append('from', from);
	url.searchParams.append('to', to);
	url.searchParams.append('include_sms', 'true');

	const response = await fetch(url.toString(), { method: 'GET' });
	const data = await response.json();
	if (data.errors) throw new Error(data.errors[0]);

	const calls: OdorikCall[] = [];
	const sms: OdorikSMS[] = [];
	const activity: ActivityItem[] = [];

	for (const item of data as Array<Record<string, unknown>>) {
		const isSms = item.destination_name === 'SMS zpráva';
		if (isSms) {
			sms.push(item as unknown as OdorikSMS);
			activity.push({ ...item, type: 'sms' } as ActivityItem);
		} else {
			calls.push(item as unknown as OdorikCall);
			activity.push({ ...item, type: 'call' } as ActivityItem);
		}
	}

	activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return { calls, sms, activity };
};

export const deleteContact = async (creds: OdorikCredentials, shortcut: number): Promise<void> => {
  const url = new URL(`https://www.odorik.cz/api/v1/speed_dials/${shortcut}.json`);
  url.searchParams.append('user', creds.user);
  url.searchParams.append('password', creds.pass);

  const response = await fetch(url.toString(), { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete contact');
};

export const addContact = async (creds: OdorikCredentials, contact: Partial<Contact>): Promise<void> => {
  const url = new URL('https://www.odorik.cz/api/v1/speed_dials.json');
  url.searchParams.append('user', creds.user);
  url.searchParams.append('password', creds.pass);

  const formData = new URLSearchParams();
  if (contact.shortcut) formData.append('shortcut', contact.shortcut.toString());
  if (contact.name) formData.append('name', contact.name);
  if (contact.number) formData.append('number', contact.number);

  const response = await fetch(url.toString(), {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to add contact');
};

export const editContact = async (creds: OdorikCredentials, oldShortcut: number, contact: Contact): Promise<void> => {
  const url = new URL(`https://www.odorik.cz/api/v1/speed_dials/${oldShortcut}.json`);
  url.searchParams.append('user', creds.user);
  url.searchParams.append('password', creds.pass);

  const formData = new URLSearchParams();
  formData.append('shortcut', contact.shortcut.toString());
  formData.append('name', contact.name);
  formData.append('number', contact.number);

  const response = await fetch(url.toString(), {
    method: 'PUT',
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to edit contact');
};

export interface OdorikCall {
  id: number;
  source_number: string;
  destination_number: string;
  destination_name: string;
  date: string;
  length: number;
  price: string;
  line: number;
  direction: "in" | "out" | "redirected";
  status: "answered" | "missed";
}

export interface OdorikSMS {
  id: number;
  source_number: string;
  destination_number: string;
  date: string;
  price: string;
  line: number;
}

export const fetchCalls = async (
  creds: OdorikCredentials,
  from: string,
  to: string,
  options?: RetryOptions
): Promise<OdorikCall[]> => {
  return withRetry(async () => {
    const url = new URL('https://www.odorik.cz/api/v1/calls.json');
    url.searchParams.append('user', creds.user);
    url.searchParams.append('password', creds.pass);
    url.searchParams.append('from', from);
    url.searchParams.append('to', to);

    const response = await fetch(url.toString(), { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch calls');
    const data = await response.json();
    if (data.errors) throw new Error(data.errors[0]);

    return data as OdorikCall[];
  }, options);
};

export const fetchSMS = async (
  creds: OdorikCredentials,
  from: string,
  to: string,
  options?: RetryOptions
): Promise<OdorikSMS[]> => {
  return withRetry(async () => {
    const url = new URL('https://www.odorik.cz/api/v1/sms/sms.json');
    url.searchParams.append('user', creds.user);
    url.searchParams.append('password', creds.pass);
    url.searchParams.append('from', from);
    url.searchParams.append('to', to);

    const response = await fetch(url.toString(), { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch SMS');
    const data = await response.json();
    if (data.errors) throw new Error(data.errors[0]);

    return data as OdorikSMS[];
  }, options);
};

export interface OdorikLine {
  id: string;
  name: string;
  caller_id?: string;
  sip_password?: string;
  public_name?: string;
  backup_number?: string;
  active_822?: string;
  active_cz_restriction?: string;
  active_iax?: string;
  active_password?: string;
  active_pin?: string;
  active_ping?: string;
  active_rtp?: string;
  active_sip?: string;
  active_anonymous?: string;
  active_greeting?: string;
  missed_call_email?: string;
  recording_email?: string;
  voicemail_email?: string;
  backup_number_email?: string;
  incoming_call_name_format?: string;
  incoming_call_number_format?: string;
}

export interface OdorikSimCard {
  id: number;
  line: number;
  phone_number: string;
  sim_number: string;
  state: 'active' | 'suspended';
  changes_in_progress: string[];
  data_package: string;
  data_package_for_next_month: string;
  data_bought_total: number;   // bytes
  data_used: number;           // bytes
  data_package_valid_from: string;
  data_package_valid_to: string;
  voice_package: string;
  voice_package_for_next_month: string;
  package_delayed_billing: string;
  package_delayed_billing_for_next_month: string;
  missed_calls_register: boolean;
  mobile_data: boolean;
  lte: boolean;
  lte_for_next_month: boolean;
  roaming: string;
  premium_services: string;
}

export const fetchSimCards = async (creds: OdorikCredentials, options?: RetryOptions): Promise<OdorikSimCard[]> => {
  return withRetry(async () => {
    const params = new URLSearchParams({ user: creds.user, password: creds.pass });
    const response = await fetch(`https://www.odorik.cz/api/v1/sim_cards.json?${params.toString()}`);
    const data = await response.json();
    if (data && data.errors) throw new Error(data.errors.join(', '));
    return data as OdorikSimCard[];
  }, options);
};

export const fetchLines = async (creds: OdorikCredentials, options?: RetryOptions): Promise<OdorikLine[]> => {
  return withRetry(async () => {
    const params = new URLSearchParams({
      user: creds.user,
      password: creds.pass,
    });

    const response = await fetch(`https://www.odorik.cz/api/v1/lines.json?${params.toString()}`);
    const data = await response.json();

    if (data && data.errors) {
      throw new Error(data.errors.join(', '));
    }
    return data as OdorikLine[];
  }, options);
};

export const fetchBalance = async (creds: OdorikCredentials, options?: RetryOptions): Promise<string> => {
  return withRetry(async () => {
    const response = await fetch(`https://www.odorik.cz/api/v1/balance?user=${creds.user}&password=${creds.pass}`);
    if (!response.ok) throw new Error('Chyba při načítání kreditu');
    return response.text();
  }, options);
};

export const orderCallback = async (
  creds: OdorikCredentials,
  recipient: string,
  caller: string,
  line?: string
) => {
  const params = new URLSearchParams({
    user: creds.user,
    password: creds.pass,
    recipient,
    caller,
  });
  if (line && line !== 'none') params.append('line', line);

  const response = await fetch('https://www.odorik.cz/api/v1/callback', {
    method: 'POST',
    body: params,
  });

  const text = await response.text();
  if (!response.ok || text.toLowerCase().startsWith('error')) {
    throw new Error(text || 'Chyba při objednávání callbacku');
  }
  return text;
};

export const sendSMS = async (
  creds: OdorikCredentials,
  recipient: string,
  message: string,
  sender?: string
) => {
  const params = new URLSearchParams({
    user: creds.user,
    password: creds.pass,
    recipient,
    message,
  });
  if (sender) params.append('sender', sender);

  const response = await fetch('https://www.odorik.cz/api/v1/sms', {
    method: 'POST',
    body: params,
  });

  const text = await response.text();
  if (!response.ok || text.toLowerCase().startsWith('error')) {
    throw new Error(text || 'Chyba při odesílání SMS');
  }
  return text;
};

export const getCacheKey = (creds: OdorikCredentials, type: 'calls' | 'sms' | 'activity') => {
  return `odorik_${type}_${creds.user}`;
};

/**
 * A unified activity feed item — either a call or an SMS, tagged with `type`.
 * Stored in the `activity` cache so the feed can be rendered as one timeline
 * without a separate merge step at display time.
 */
export type ActivityItem =
	| (OdorikCall & { type: 'call' })
	| (OdorikSMS & { type: 'sms' });

// ─── IndexedDB Cache ──────────────────────────────────────────────────────────

const DB_NAME = 'odorik_cache';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
	if (dbPromise) return dbPromise;
	dbPromise = new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'key' });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
	return dbPromise;
}

export const loadFromCache = async <T>(key: string): Promise<T[]> => {
	try {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.get(key);
			request.onsuccess = () => {
				const result = request.result;
				resolve(result ? result.data : []);
			};
			request.onerror = () => reject(request.error);
		});
	} catch (e) {
		console.warn('Failed to load from cache', e);
		return [];
	}
};

export const saveToCache = async <T>(key: string, data: T[]): Promise<void> => {
	try {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			store.put({ key, data, timestamp: Date.now() });
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	} catch (e) {
		console.warn('Failed to save to cache', e);
	}
};

export const readCache = async <T>(key: string): Promise<TimestampedCacheEntry<T> | null> => {
	try {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.get(key);
			request.onsuccess = () => {
				const result = request.result;
				if (result && result.data !== undefined) {
					resolve({ data: result.data, timestamp: result.timestamp });
				} else {
					resolve(null);
				}
			};
			request.onerror = () => reject(request.error);
		});
	} catch {
		return null;
	}
};

export const writeCache = async <T>(key: string, data: T): Promise<void> => {
	try {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			store.put({ key, data, timestamp: Date.now() });
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	} catch (e) {
		console.error('Cache write failed', e);
	}
};

// ─── Timestamped cache helpers ────────────────────────────────────────────────

/** Cache TTL constants */
export const CACHE_TTL_1_DAY = 24 * 60 * 60 * 1000;
export const CACHE_TTL_10_MIN = 10 * 60 * 1000;

/** A cache entry that stores data along with the time it was written. */
export interface TimestampedCacheEntry<T> {
	data: T;
	timestamp: number; // Unix ms (Date.now())
}

/**
 * Returns true if the given cache entry is absent or older than ttlMs.
 * A null entry is always considered stale.
 */
export const isCacheStale = (
	entry: TimestampedCacheEntry<unknown> | null,
	ttlMs: number,
): boolean => {
	if (!entry) return true;
	return Date.now() - entry.timestamp > ttlMs;
};

/**
 * Returns true when the browser reports no network connectivity.
 * Components should skip fetch calls when this returns true.
 */
export const isOffline = (): boolean => !navigator.onLine;

// ─── Active Calls ─────────────────────────────────────────────────────────────

export interface OdorikActiveCall {
	id: number;
	source_number: string;
	destination_number: string;
	destination_name: string;
	start_date: string;
	answer_date: string;
	price_per_minute: number;
	line: number;
}

export const fetchActiveCalls = async (
	creds: OdorikCredentials,
	options?: RetryOptions,
): Promise<OdorikActiveCall[]> => {
	return withRetry(async () => {
		const params = new URLSearchParams({
			user: creds.user,
			password: creds.pass,
		});

		const response = await fetch(
			`https://www.odorik.cz/api/v1/active_calls.json?${params.toString()}`,
		);
		if (!response.ok) throw new Error('Failed to fetch active calls');
		const data = await response.json();
		if (data && data.errors) throw new Error(data.errors.join(', '));
		return data as OdorikActiveCall[];
	}, options);
};

export const terminateCall = async (
	creds: OdorikCredentials,
	callId: number,
): Promise<void> => {
	const params = new URLSearchParams({
		user: creds.user,
		password: creds.pass,
	});

	const response = await fetch(
		`https://www.odorik.cz/api/v1/active_calls/${callId}.json?${params.toString()}`,
		{ method: 'DELETE' },
	);

	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || 'Failed to terminate call');
	}
};

// ─── Per-entity cache key factories ──────────────────────────────────────────

export const getBalanceCacheKey = (creds: OdorikCredentials): string =>
	`odorik_balance_${creds.user}`;

export const getLinesCacheKey = (creds: OdorikCredentials): string =>
	`odorik_lines_${creds.user}`;

export const getSimCardsCacheKey = (creds: OdorikCredentials): string =>
	`odorik_simcards_${creds.user}`;

/**
 * Remove all odorik data from IndexedDB cache.
 * Call this on logout or when a different user logs in so stale data
 * from the previous session is never shown.
 */
export const clearAllCaches = async (): Promise<void> => {
	// Clear IndexedDB cache
	try {
		const db = await openDB();
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const request = store.clear();
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	} catch (e) {
		console.warn('Failed to clear IndexedDB cache', e);
	}

	// Clear legacy localStorage cache
	try {
		const keys: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith('odorik_')) {
				keys.push(key);
			}
		}
		keys.forEach(k => localStorage.removeItem(k));
	} catch (e) {
		console.warn('Failed to clear localStorage cache', e);
	}
};
