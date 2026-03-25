import { describe, it, expect } from 'vitest';
import { splitPhoneNo, unifyPhoneNo, parseContactName, lookupContact } from './api';

describe('splitPhoneNo', () => {
  it('should split Czech phone number with +420 prefix', () => {
    const result = splitPhoneNo('+420777123456');
    expect(result).toEqual({ prefix: '+420', number: '777123456' });
  });

  it('should split phone number with 00 prefix', () => {
    const result = splitPhoneNo('00420777123456');
    expect(result).toEqual({ prefix: '+420', number: '777123456' });
  });

  it('should handle numbers without prefix', () => {
    const result = splitPhoneNo('777123456');
    expect(result).toEqual({ prefix: '', number: '777123456' });
  });

  it('should handle empty string', () => {
    const result = splitPhoneNo('');
    expect(result).toEqual({ prefix: '', number: '' });
  });

  it('should handle numbers with spaces', () => {
    const result = splitPhoneNo('+420 777 123 456');
    expect(result.prefix).toBe('+420');
  });
});

describe('unifyPhoneNo', () => {
  it('should format Czech mobile number', () => {
    expect(unifyPhoneNo('+420777123456')).toBe('+420 777123456');
  });

  it('should return unchanged for numbers without prefix', () => {
    expect(unifyPhoneNo('777123456')).toBe('777123456');
  });

  it('should handle empty string', () => {
    expect(unifyPhoneNo('')).toBe('');
  });
});

describe('parseContactName', () => {
  it('should parse simple name', () => {
    const result = parseContactName('Jan Novak');
    expect(result).toEqual({
      name: 'Jan Novak',
      surname: '',
      note: '',
      displayName: 'Jan Novak',
    });
  });

  it('should parse name with surname in bold tags', () => {
    const result = parseContactName('Jan <b>Novak</b>');
    expect(result).toEqual({
      name: 'Jan',
      surname: 'Novak',
      note: '',
      displayName: 'Jan Novak',
    });
  });

  it('should parse name with surname and note', () => {
    const result = parseContactName('Jan <b>Novak</b> <i>poznamka</i>');
    expect(result).toEqual({
      name: 'Jan',
      surname: 'Novak',
      note: 'poznamka',
      displayName: 'Jan Novak',
    });
  });

  it('should handle empty string', () => {
    const result = parseContactName('');
    expect(result).toEqual({
      name: '',
      surname: '',
      note: '',
      displayName: '',
    });
  });
});

describe('lookupContact', () => {
  const contacts = [
    { shortcut: 1, number: '+420777123456', name: 'Test User' },
    { shortcut: 2, number: '00420800123456', name: 'Support' },
    { shortcut: 3, number: '777987654', name: 'Another User' },
  ];

  it('should find contact by full number with + prefix', () => {
    const result = lookupContact('+420777123456', contacts);
    expect(result).toEqual(contacts[0]);
  });

  it('should find contact by number with 00 prefix', () => {
    const result = lookupContact('00420777123456', contacts);
    expect(result).toEqual(contacts[0]);
  });

  it('should find contact by local number (9 digits match)', () => {
    const result = lookupContact('777123456', contacts);
    expect(result).toEqual(contacts[0]);
  });

  it('should return undefined for non-existent number', () => {
    const result = lookupContact('+420999999999', contacts);
    expect(result).toBeUndefined();
  });

  it('should return undefined for short numbers', () => {
    const result = lookupContact('123', contacts);
    expect(result).toBeUndefined();
  });
});
