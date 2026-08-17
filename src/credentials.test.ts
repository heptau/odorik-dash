import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { saveCredentials, loadCredentials, clearCredentials } from './api';
import type { OdorikCredentials } from './api';

describe('Credential Functions', () => {
  let store: Record<string, string> = {};
  const testCreds: OdorikCredentials = { user: 'testuser', pass: 'testpass' };

  // Mock Web Crypto API. encrypt/decrypt are identity pass-throughs here (the
  // point of these tests is the storage/migration logic, not real AES-GCM),
  // so a save followed by a load round-trips the original plaintext bytes.
  const toArrayBuffer = (data: ArrayBuffer | ArrayBufferView) => {
    const bytes = ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data);
    return bytes.slice().buffer;
  };
  const mockEncrypt = vi.fn().mockImplementation((_algorithm, _key, data) => Promise.resolve(toArrayBuffer(data)));
  const mockDecrypt = vi.fn().mockImplementation((_algorithm, _key, data) => Promise.resolve(toArrayBuffer(data)));
  const mockImportKey = vi.fn().mockResolvedValue({ type: 'secret', algorithm: { name: 'AES-GCM' } });
  const mockDigest = vi.fn().mockResolvedValue(new ArrayBuffer(32));
  const mockGetRandomValues = vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) arr[i] = i % 256;
    return arr;
  });

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
        getRandomValues: mockGetRandomValues,
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
      expect(mockImportKey).toHaveBeenCalled();
      expect(mockEncrypt).toHaveBeenCalled();
      expect(mockGetRandomValues).toHaveBeenCalled();
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

    it('should round-trip credentials through save and load using a per-device key', async () => {
      await saveCredentials(testCreds);
      const loaded = await loadCredentials();

      expect(loaded).toEqual(testCreds);
      expect(store['odorik_device_key']).toBeDefined();

      const stored = JSON.parse(atob(store['odorik_credentials']));
      expect(Array.isArray(stored)).toBe(false);
      expect(stored.iv).toBeDefined();
      expect(stored.data).toBeDefined();
    });

    it('should reuse the same device key across multiple saves instead of regenerating it', async () => {
      await saveCredentials(testCreds);
      const deviceKeyAfterFirstSave = store['odorik_device_key'];

      await saveCredentials({ user: 'other', pass: 'other-pass' });

      expect(store['odorik_device_key']).toBe(deviceKeyAfterFirstSave);
    });

    it('should use distinct IVs for each encryption (no nonce reuse)', async () => {
      mockGetRandomValues.mockClear();
      // First call to getRandomValues generates the device key, subsequent
      // calls generate the per-encryption IV.
      await saveCredentials(testCreds);
      await saveCredentials(testCreds);

      const ivCalls = mockGetRandomValues.mock.calls.filter(([arr]) => arr.length === 12);
      expect(ivCalls.length).toBe(2);
    });

    it('should migrate legacy (fixed-key, zero-IV) credentials to the new format on load', async () => {
      // Simulate credentials saved by the old getEncryptionKey()/zero-IV scheme:
      // a plain ciphertext byte array with no per-device key or IV metadata.
      const legacyCiphertext = Array.from(new TextEncoder().encode(JSON.stringify(testCreds)));
      store['odorik_credentials'] = btoa(JSON.stringify(legacyCiphertext));

      const loaded = await loadCredentials();
      expect(loaded).toEqual(testCreds);

      // Migration should have rewritten storage into the new {iv, data} format.
      const migrated = JSON.parse(atob(store['odorik_credentials']));
      expect(Array.isArray(migrated)).toBe(false);
      expect(migrated.iv).toBeDefined();
      expect(store['odorik_device_key']).toBeDefined();
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
