import { betterAuth } from 'better-auth';
import { getRuntimeConfig } from '../config/runtime';
import { getDatabase } from '../db/db';

function resolveAuthSecret(): string {
  return process.env.BETTER_AUTH_SECRET?.trim() || 'dev-secret-change-me';
}

export async function getAuth() {
  const { sqlite } = await getDatabase();
  const runtime = getRuntimeConfig();
  return betterAuth({
    database: sqlite.raw,
    baseURL: runtime.appBaseUrl,
    secret: resolveAuthSecret(),
    trustedOrigins: runtime.trustedOrigins,
    advanced: runtime.authCookieDomain
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: runtime.authCookieDomain,
          },
        }
      : undefined,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
  });
}
