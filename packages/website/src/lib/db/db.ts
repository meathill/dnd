import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function getDatabase() {
  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB;
  if (!db) {
    throw new Error('缺少 DB 绑定');
  }
  return db;
}
