import { describe, expect, it } from 'vitest';
import { canAdmin, canEdit, isAdminEmail, resolveSessionRole } from './permission';

describe('permission', () => {
  it('treats admin email match case-insensitively', () => {
    expect(isAdminEmail('Foo@Example.com', ['foo@example.com'])).toBe(true);
    expect(isAdminEmail('  bar@example.com  ', ['bar@example.com'])).toBe(true);
    expect(isAdminEmail('baz@example.com', ['foo@example.com'])).toBe(false);
    expect(isAdminEmail('', ['foo@example.com'])).toBe(false);
  });

  it('grants admin scope only to email allowlist', () => {
    const admins = ['admin@example.com'];
    expect(canAdmin({ email: 'admin@example.com', role: 'user' }, admins)).toBe(true);
    expect(canAdmin({ email: 'editor@example.com', role: 'editor' }, admins)).toBe(false);
  });

  it('grants editor scope to admins and editors', () => {
    const admins = ['admin@example.com'];
    expect(canEdit({ email: 'admin@example.com', role: 'user' }, admins)).toBe(true);
    expect(canEdit({ email: 'editor@example.com', role: 'editor' }, admins)).toBe(true);
    expect(canEdit({ email: 'normal@example.com', role: 'user' }, admins)).toBe(false);
  });

  it('normalizes session role string to typed value', () => {
    expect(resolveSessionRole('editor')).toBe('editor');
    expect(resolveSessionRole('user')).toBe('user');
    expect(resolveSessionRole(null)).toBe('user');
    expect(resolveSessionRole(undefined)).toBe('user');
    expect(resolveSessionRole('something-else')).toBe('user');
  });
});
