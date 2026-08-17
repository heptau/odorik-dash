import { describe, it, expect } from 'vitest';
import { splitPhoneNo, unifyPhoneNo, parseContactName, buildContactName, lookupContact, isInternalPhone, lookupLineByNumber, lookupLineById, lookupContactOrLine } from './api';

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

  it('should parse name built with invisible markers (surname only)', () => {
    const result = parseContactName(buildContactName('Jan', 'Novak', ''));
    expect(result).toEqual({
      name: 'Jan',
      surname: 'Novak',
      note: '',
      displayName: 'Jan Novak',
    });
  });

  it('should parse name built with invisible markers (surname and note)', () => {
    const result = parseContactName(buildContactName('Jan', 'Novak', 'poznamka'));
    expect(result).toEqual({
      name: 'Jan',
      surname: 'Novak',
      note: 'poznamka',
      displayName: 'Jan Novak',
    });
  });

  it('should parse name built with invisible markers (note only)', () => {
    const result = parseContactName(buildContactName('Jan', '', 'poznamka'));
    expect(result).toEqual({
      name: 'Jan',
      surname: '',
      note: 'poznamka',
      displayName: 'Jan',
    });
  });
});

describe('buildContactName', () => {
  it('should not contain HTML tags', () => {
    const fullname = buildContactName('Jan', 'Novak', 'poznamka');
    expect(fullname).not.toMatch(/[<>]/);
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

describe('isInternalPhone', () => {
  it('should return true for numbers starting with *', () => {
    expect(isInternalPhone('*123')).toBe(true);
    expect(isInternalPhone('*100')).toBe(true);
  });

  it('should return true for numbers starting with #', () => {
    expect(isInternalPhone('#123')).toBe(true);
  });

  it('should return false for regular phone numbers', () => {
    expect(isInternalPhone('+420777123456')).toBe(false);
    expect(isInternalPhone('777123456')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isInternalPhone('')).toBe(false);
  });
});

describe('lookupLineByNumber', () => {
  const lines = [
    { id: '1', caller_id: '+420777111222', name: 'Line 1' },
    { id: '2', caller_id: '+420777333444', name: 'Line 2' },
    { id: '3', caller_id: '*111', name: 'Internal' },
  ];

  it('should find line by full number with + prefix', () => {
    const result = lookupLineByNumber('+420777111222', lines as any);
    expect(result).toEqual(lines[0]);
  });

  it('should return undefined for non-existent number', () => {
    const result = lookupLineByNumber('+420999999999', lines as any);
    expect(result).toBeUndefined();
  });

  it('should return undefined for short numbers', () => {
    const result = lookupLineByNumber('123', lines as any);
    expect(result).toBeUndefined();
  });
});

describe('lookupLineById', () => {
  const lines = [
    { id: '1', number: '+420777111222', name: 'Line 1' },
    { id: '2', number: '+420777333444', name: 'Line 2' },
  ];

  it('should find line by string id', () => {
    const result = lookupLineById('1', lines as any);
    expect(result).toEqual(lines[0]);
  });

  it('should find line by number id', () => {
    const result = lookupLineById(2, lines as any);
    expect(result).toEqual(lines[1]);
  });

  it('should return undefined for non-existent id', () => {
    const result = lookupLineById('999', lines as any);
    expect(result).toBeUndefined();
  });
});

describe('lookupContactOrLine', () => {
  const contacts = [
    { shortcut: 1, number: '+420777123456', name: 'Contact 1' },
  ] as any;
  const lines = [
    { id: '1', caller_id: '+420777111222', name: 'Line 1' },
  ] as any;

  it('should find contact by phone number', () => {
    const result = lookupContactOrLine('+420777123456', contacts, lines);
    expect(result?.type).toBe('contact');
  });

  it('should return undefined for non-existent number', () => {
    const result = lookupContactOrLine('+420999999999', contacts, lines);
    expect(result).toBeUndefined();
  });
});
