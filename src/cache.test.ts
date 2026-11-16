import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCacheKey,
  getBalanceCacheKey,
  getLinesCacheKey,
  getSimCardsCacheKey,
  CACHE_TTL_1_DAY,
  CACHE_TTL_10_MIN,
  isCacheStale,
  clearAllCaches,
  fetchBalance,
} from './api';

describe('Cache key factories', () => {
  const creds = { user: 'testuser', pass: 'testpass' };

  it('should generate correct cache key', () => {
    expect(getCacheKey(creds, 'calls')).toBe('odorik_calls_testuser');
    expect(getCacheKey(creds, 'sms')).toBe('odorik_sms_testuser');
    expect(getCacheKey(creds, 'activity')).toBe('odorik_activity_testuser');
  });

  it('should generate correct balance cache key', () => {
    expect(getBalanceCacheKey(creds)).toBe('odorik_balance_testuser');
  });

  it('should generate correct lines cache key', () => {
    expect(getLinesCacheKey(creds)).toBe('odorik_lines_testuser');
  });

  it('should generate correct sim cards cache key', () => {
    expect(getSimCardsCacheKey(creds)).toBe('odorik_simcards_testuser');
  });
});

describe('Cache TTL constants', () => {
  it('should have correct TTL values', () => {
    expect(CACHE_TTL_1_DAY).toBe(24 * 60 * 60 * 1000);
    expect(CACHE_TTL_10_MIN).toBe(10 * 60 * 1000);
  });
});

describe('isCacheStale', () => {
  it('should return true for null entry', () => {
    expect(isCacheStale(null, CACHE_TTL_10_MIN)).toBe(true);
  });

  it('should return true for expired cache', () => {
    const entry = {
      data: 'test',
      timestamp: Date.now() - CACHE_TTL_1_DAY * 2,
    };
    expect(isCacheStale(entry, CACHE_TTL_1_DAY)).toBe(true);
  });

  it('should return false for fresh cache', () => {
    const entry = {
      data: 'test',
      timestamp: Date.now(),
    };
    expect(isCacheStale(entry, CACHE_TTL_1_DAY)).toBe(false);
  });

  it('should return false for cache within TTL', () => {
    const entry = {
      data: 'test',
      timestamp: Date.now() - CACHE_TTL_10_MIN / 2,
    };
    expect(isCacheStale(entry, CACHE_TTL_10_MIN)).toBe(false);
  });
});
describe('clearAllCaches', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {
      odorik_credentials: 'ciphertext',
      odorik_device_key: 'key',
      odorik_locale: 'cs',
      odorik_calls_testuser: '[]',
      cache_ttl: '{}',
    };
    vi.stubGlobal('localStorage', {
      get length() { return Object.keys(store).length; },
      key: (i: number) => Object.keys(store)[i] ?? null,
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('should remove cached data but keep credentials, device key and language', async () => {
    await clearAllCaches();

    expect(Object.keys(store).sort()).toEqual(['cache_ttl', 'odorik_credentials', 'odorik_device_key', 'odorik_locale']);
  });
});

describe('fetchBalance', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('should URL-encode credentials containing reserved characters', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '123.45' });
    vi.stubGlobal('fetch', fetchMock);

    const balance = await fetchBalance({ user: '123456', pass: 'p&ss#w=rd +1' }, { retries: 1 });

    expect(balance).toBe('123.45');
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get('user')).toBe('123456');
    expect(url.searchParams.get('password')).toBe('p&ss#w=rd +1');
  });
});
