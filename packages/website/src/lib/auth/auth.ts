import { getCloudflareContext } from '@opennextjs/cloudflare';
import { betterAuth } from 'better-auth';
import { getDatabase } from '../db/db';

async function resolveAuthSecret(): Promise<string> {
  const { env } = await getCloudflareContext({ async: true });
  return env.BETTER_AUTH_SECRET ?? 'dev-secret-change-me';
}

export async function getAuth() {
  const db = await getDatabase();
  const secret = await resolveAuthSecret();
  return betterAuth({
    database: db,
    secret,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
  });
}
