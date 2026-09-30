import { describe, expect, it } from 'vitest';
import {
  credentialsSchema,
  errorMessage,
  normalizePhone,
  validateMessage,
} from './validation';
describe('validation', () => {
  it.each(['+7 (999) 123-45-67', '79991234567'])('normalizes %s', (value) =>
    expect(normalizePhone(value)).toBe('79991234567'),
  );
  it('accepts Belarus', () =>
    expect(normalizePhone('+375 29 1234567')).toBe('375291234567'));
  it.each([
    'abc79991234567',
    '+1 2345678900',
    '89991234567',
    '',
    '799912345678',
    '7<script>',
  ])('rejects %s', (value) => expect(() => normalizePhone(value)).toThrow());
  it('validates messages without stripping safe literal markup', () => {
    expect(validateMessage(' <b>Hello</b> ')).toBe('<b>Hello</b>');
    expect(validateMessage('a'.repeat(4000))).toHaveLength(4000);
    expect(() => validateMessage('  ')).toThrow();
    expect(() => validateMessage('a'.repeat(4001))).toThrow();
  });
  const credentials = {
    apiUrl: 'https://3100.api.green-api.com',
    idInstance: '123',
    apiTokenInstance: 'token',
  };
  it('accepts trusted URL', () =>
    expect(credentialsSchema.safeParse(credentials).success).toBe(true));
  it.each([
    'https://evil.com',
    'https://api.green-api.com.evil.com',
    'http://api.green-api.com',
    'https://api.green-api.com:123',
    'https://user@api.green-api.com',
    'https://api.green-api.com/a',
    'https://api.green-api.com?x=1',
    'https://api.green-api.com#x',
    'nope',
  ])('rejects token exfiltration URL %s', (apiUrl) =>
    expect(
      credentialsSchema.safeParse({ ...credentials, apiUrl }).success,
    ).toBe(false),
  );
  it('validates credentials', () => {
    expect(
      credentialsSchema.safeParse({ ...credentials, idInstance: 'abc' })
        .success,
    ).toBe(false);
    expect(
      credentialsSchema.safeParse({ ...credentials, apiTokenInstance: '' })
        .success,
    ).toBe(false);
  });
  it('formats errors', () => {
    expect(errorMessage(new Error('test'))).toBe('test');
    expect(errorMessage(null)).toContain('Неизвестная');
  });
});
