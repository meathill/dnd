import { getCloudflareContext } from '@opennextjs/cloudflare';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import { authSchema } from './auth-schema';
import { getDatabase } from '../db/db';

async function resolveAuthSecret(): Promise<string> {
  const { env } = await getCloudflareContext({ async: true });
  return env.BETTER_AUTH_SECRET ?? 'dev-secret-change-me';
}

export async function getAuth() {
  const d1 = await getDatabase();
  const secret = await resolveAuthSecret();
  const db = drizzle(d1, { schema: authSchema });
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite', schema: authSchema }),
    secret,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
  });
}
