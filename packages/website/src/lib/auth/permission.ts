import { resolveAdminEmails } from '../config/runtime';
import type { SessionInfo, UserRole } from '../game/types';

export type PermissionContext = Pick<SessionInfo, 'email' | 'role'>;

export function isAdminEmail(email: string, adminEmails: ReadonlyArray<string>): boolean {
  if (!email) {
    return false;
  }
  const normalized = email.trim().toLowerCase();
  return adminEmails.some((entry) => entry === normalized);
}

export function canEdit(context: PermissionContext, adminEmails: ReadonlyArray<string>): boolean {
  if (isAdminEmail(context.email, adminEmails)) {
    return true;
  }
  return context.role === 'editor';
}

export function canAdmin(context: PermissionContext, adminEmails: ReadonlyArray<string>): boolean {
  return isAdminEmail(context.email, adminEmails);
}

export async function isAdmin(email: string): Promise<boolean> {
  const adminEmails = await resolveAdminEmails();
  return isAdminEmail(email, adminEmails);
}

export function resolveSessionRole(role: string | undefined | null): UserRole {
  return role === 'editor' ? 'editor' : 'user';
}
