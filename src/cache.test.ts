import { describe, it, expect } from 'vitest';
import {
  getCacheKey,
  getBalanceCacheKey,
  getLinesCacheKey,
  getSimCardsCacheKey,
  CACHE_TTL_1_DAY,
  CACHE_TTL_10_MIN,
  isCacheStale,
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