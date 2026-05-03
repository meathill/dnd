import { betterAuth } from 'better-auth';
import { getDatabase } from '../db/db';

function resolveAuthSecret(): string {
  return process.env.BETTER_AUTH_SECRET?.trim() || 'dev-secret-change-me';
}

export async function getAuth() {
  const { sqlite } = await getDatabase();
  return betterAuth({
    database: sqlite.raw,
    secret: resolveAuthSecret(),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
  });
}
