import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { saveCredentials, loadCredentials, clearCredentials } from './api';
import type { OdorikCredentials } from './api';

describe('Credential Functions', () => {
  let store: Record<string, string> = {};
  const testCreds: OdorikCredentials = { user: 'testuser', pass: 'testpass' };

  // Mock Web Crypto API
  const mockEncrypt = vi.fn().mockResolvedValue(new ArrayBuffer(32));
  const mockDecrypt = vi.fn().mockImplementation((_algorithm, _key, data) => {
    const decoded = JSON.parse(new TextDecoder().decode(data));
    return Promise.resolve(new TextEncoder().encode(JSON.stringify(decoded)).buffer);
  });
  const mockImportKey = vi.fn().mockResolvedValue({ type: 'secret', algorithm: { name: 'AES-GCM' } });
  const mockDigest = vi.fn().mockResolvedValue(new ArrayBuffer(32));

  beforeEach(() => {
    store = {};
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
      get length() {
        return Object.keys(store).length;
      },
      key: vi.fn((index: number) => Object.keys(store)[index] || null),
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });

    // Mock crypto.webcrypto
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        subtle: {
          encrypt: mockEncrypt,
          decrypt: mockDecrypt,
          importKey: mockImportKey,
          digest: mockDigest,
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveCredentials / loadCredentials', () => {
    it('should save credentials to localStorage', async () => {
      await saveCredentials(testCreds);
      expect(store['odorik_credentials']).toBeDefined();
    });

    it('should call crypto functions when saving', async () => {
      await saveCredentials(testCreds);
      expect(mockDigest).toHaveBeenCalled();
      expect(mockImportKey).toHaveBeenCalled();
      expect(mockEncrypt).toHaveBeenCalled();
    });

    it('should return null when no credentials saved', async () => {
      const loaded = await loadCredentials();
      expect(loaded).toBeNull();
    });

    it('should clear credentials from localStorage when corrupted', async () => {
      // Save invalid data
      store['odorik_credentials'] = 'invalid-data';
      
      const loaded = await loadCredentials();
      
      expect(loaded).toBeNull();
      expect(store['odorik_credentials']).toBeUndefined();
    });
  });

  describe('clearCredentials', () => {
    it('should remove credentials from localStorage', async () => {
      await saveCredentials(testCreds);
      expect(store['odorik_credentials']).toBeDefined();
      
      clearCredentials();
      
      expect(store['odorik_credentials']).toBeUndefined();
    });

    it('should not throw when no credentials exist', () => {
      expect(() => clearCredentials()).not.toThrow();
    });
  });
});
