import { getCloudflareContext } from '@opennextjs/cloudflare';

type RootEnv = {
  ROOT_USER_IDS?: string;
  ROOT_USER_ID?: string;
  ROOT_USER_EMAILS?: string;
  ROOT_USER_EMAIL?: string;
};

type RootUserInput = {
  id: string;
  email?: string | null;
};

function parseEnvList(value?: string): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function isRootUser(user: RootUserInput): Promise<boolean> {
  const { env } = await getCloudflareContext({ async: true });
  const rootEnv = env as RootEnv;
  const rootIds = new Set([...parseEnvList(rootEnv.ROOT_USER_IDS), ...parseEnvList(rootEnv.ROOT_USER_ID)]);
  const rootEmails = new Set(
    [...parseEnvList(rootEnv.ROOT_USER_EMAILS), ...parseEnvList(rootEnv.ROOT_USER_EMAIL)].map((value) =>
      value.toLowerCase(),
    ),
  );

  if (rootIds.size === 0 && rootEmails.size === 0) {
    return false;
  }

  if (rootIds.has(user.id)) {
    return true;
  }

  if (user.email && rootEmails.has(user.email.toLowerCase())) {
    return true;
  }

  return false;
}
