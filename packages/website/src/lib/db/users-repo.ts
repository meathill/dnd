import type { UserAccountRecord, UserRole } from '../game/types';
import { queryAll, queryFirst } from './_internal';
import { getDatabase } from './db';

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: number;
};

function normalizeUserRole(value: string): UserRole {
  return value === 'editor' ? 'editor' : 'user';
}

function mapUser(row: UserRow): UserAccountRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: normalizeUserRole(row.role),
    createdAt: row.createdAt,
  };
}

export async function getUserById(id: string): Promise<UserAccountRecord | null> {
  const { sqlite } = await getDatabase();
  const row = await queryFirst<UserRow>(sqlite, 'SELECT id, email, name, role, createdAt FROM "user" WHERE id = ?', [
    id,
  ]);
  return row ? mapUser(row) : null;
}

export async function listAllUsers(): Promise<UserAccountRecord[]> {
  const { sqlite } = await getDatabase();
  const rows = await queryAll<UserRow>(
    sqlite,
    'SELECT id, email, name, role, createdAt FROM "user" ORDER BY createdAt DESC',
  );
  return rows.map(mapUser);
}

export async function updateUserRole(id: string, role: UserRole): Promise<UserAccountRecord | null> {
  const { sqlite } = await getDatabase();
  const updatedAt = Date.now();
  await sqlite.execute('UPDATE "user" SET role = ?, updatedAt = ? WHERE id = ?', [role, updatedAt, id]);
  return getUserById(id);
}
