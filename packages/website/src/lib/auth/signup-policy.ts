import { getCloudflareContext } from '@opennextjs/cloudflare';

const DISABLED_VALUES = new Set(['0', 'false', 'off', 'no']);

export function parseAllowSignUp(value: string | undefined | null): boolean {
  if (!value) {
    return true;
  }
  const normalized = value.trim().toLowerCase();
  return !DISABLED_VALUES.has(normalized);
}

export async function resolveAllowSignUp(): Promise<boolean> {
  const { env } = await getCloudflareContext({ async: true });
  return parseAllowSignUp(env.ALLOW_SIGN_UP);
}
