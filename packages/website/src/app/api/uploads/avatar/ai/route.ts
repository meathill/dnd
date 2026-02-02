import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/auth';
import { generateImage } from '@/lib/ai/ai-provider';
import { buildAssetUrl, getAssetsBucket } from '@/lib/assets/assets';
import { getDatabase } from '@/lib/db/db';
import { getUserSettings } from '@/lib/db/repositories';

type AvatarAiResponse = { url?: string; error?: string };

function resolveFileExtension(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (normalized.startsWith('image/')) {
    const [, rawExtension = ''] = normalized.split('/');
    const extension = rawExtension.split('+')[0];
    if (extension === 'jpeg') {
      return 'jpg';
    }
    if (extension) {
      return extension;
    }
  }
  return 'png';
}

function decodeBase64(value: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(value, 'base64'));
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function POST(request: Request) {
  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return NextResponse.json<AvatarAiResponse>({ error: '未登录无法生成头像' }, { status: 401 });
  }

  let payload: { prompt?: unknown };
  try {
    payload = (await request.json()) as { prompt?: unknown };
  } catch {
    return NextResponse.json<AvatarAiResponse>({ error: '请求体不是有效的 JSON' }, { status: 400 });
  }

  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (!prompt) {
    return NextResponse.json<AvatarAiResponse>({ error: '缺少头像描述' }, { status: 400 });
  }

  try {
    const auth = await getAuth();
    const authSession = await auth.api.getSession({ headers: request.headers });
    if (!authSession?.user) {
      return NextResponse.json<AvatarAiResponse>({ error: '未登录无法生成头像' }, { status: 401 });
    }

    const db = await getDatabase();
    const settings = await getUserSettings(db, authSession.user.id);
    const provider = settings?.provider ?? 'openai';
    const result = await generateImage({ provider, prompt });

    const bucket = await getAssetsBucket();
    const extension = resolveFileExtension(result.mimeType);
    const key = `avatars/${authSession.user.id}/${crypto.randomUUID()}.${extension}`;
    const bytes = decodeBase64(result.base64);
    await bucket.put(key, bytes, {
      httpMetadata: {
        contentType: result.mimeType || `image/${extension}`,
      },
    });

    return NextResponse.json<AvatarAiResponse>({ url: await buildAssetUrl(key) });
  } catch (error) {
    console.error('[api/uploads/avatar/ai] 头像生成失败', error);
    const message = error instanceof Error ? error.message : '头像生成失败';
    return NextResponse.json<AvatarAiResponse>({ error: message }, { status: 500 });
  }
}
