import { getCloudflareContext } from '@opennextjs/cloudflare';

type AssetBucketEnv = {
  ASSETS_BUCKET?: R2Bucket;
};

export async function getAssetsBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  const bucket = (env as AssetBucketEnv).ASSETS_BUCKET;
  if (!bucket || typeof bucket.put !== 'function') {
    throw new Error('缺少 ASSETS_BUCKET 存储桶绑定');
  }
  return bucket;
}

export async function resolveAssetBaseUrl(): Promise<string> {
  const { env } = await getCloudflareContext({ async: true });
  const baseUrl = env.NEXT_PUBLIC_ASSET_URL?.trim();
  if (!baseUrl) {
    throw new Error('缺少 NEXT_PUBLIC_ASSET_URL 配置');
  }
  return baseUrl.replace(/\/+$/, '');
}

export async function buildAssetUrl(key: string): Promise<string> {
  const baseUrl = await resolveAssetBaseUrl();
  const normalizedKey = key.replace(/^\/+/, '');
  return `${baseUrl}/${normalizedKey}`;
}
