import { getCloudflareContext } from '@opennextjs/cloudflare';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { getRuntimeConfig } from '../config/runtime';
import { getDatabase } from '../db/db';
import { authSchema } from './auth-schema';

const CLOUDFLARE_CONTEXT_SYMBOL = Symbol.for('__cloudflare-context__');

function resolveAuthSecret(): string {
  return process.env.BETTER_AUTH_SECRET?.trim() || 'dev-secret-change-me';
}

function hasCloudflareContext(): boolean {
  return Boolean((globalThis as Record<PropertyKey, unknown>)[CLOUDFLARE_CONTEXT_SYMBOL]);
}

async function createD1DrizzleDatabase() {
  if (hasCloudflareContext() && !process.env.DATABASE_URL?.trim()) {
    const { env } = await getCloudflareContext({ async: true });
    if (!env.DB) {
      throw new Error('Cloudflare D1 绑定 DB 未配置');
    }
    return drizzleD1(env.DB, { schema: authSchema });
  }

  return null;
}

async function createNodeSqliteDatabase() {
  await getDatabase();
  const { DatabaseSync } = await import('node:sqlite');
  const filePath = process.env.DATABASE_URL?.trim() || `${process.cwd()}/.local/website.sqlite`;
  return new DatabaseSync(filePath);
}

export async function getAuth() {
  const runtime = getRuntimeConfig();
  const d1Db = await createD1DrizzleDatabase();
  return betterAuth({
    database: d1Db
      ? drizzleAdapter(d1Db, {
          provider: 'sqlite',
          schema: authSchema,
          transaction: true,
        })
      : await createNodeSqliteDatabase(),
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
