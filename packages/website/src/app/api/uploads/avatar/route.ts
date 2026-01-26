import { NextResponse } from 'next/server';
import { getAuth } from '../../../../lib/auth/auth';
import { buildAssetUrl, getAssetsBucket } from '../../../../lib/assets/assets';

type UploadResponse = { url?: string; error?: string };

function resolveFileExtension(file: File): string {
  const type = file.type.toLowerCase();
  if (type.startsWith('image/')) {
    const [, rawExtension = ''] = type.split('/');
    const normalized = rawExtension.split('+')[0];
    if (normalized === 'jpeg') {
      return 'jpg';
    }
    if (normalized) {
      return normalized;
    }
  }
  const nameParts = file.name.split('.');
  const nameExtension = nameParts.length > 1 ? nameParts.pop() : '';
  if (nameExtension) {
    return nameExtension.toLowerCase();
  }
  return 'png';
}

export async function POST(request: Request) {
  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return NextResponse.json<UploadResponse>({ error: '未登录无法上传头像' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json<UploadResponse>({ error: '请求体不是有效的表单数据' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json<UploadResponse>({ error: '缺少头像文件' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json<UploadResponse>({ error: '仅支持图片文件' }, { status: 400 });
  }

  try {
    const auth = await getAuth();
    const authSession = await auth.api.getSession({ headers: request.headers });
    if (!authSession?.user) {
      return NextResponse.json<UploadResponse>({ error: '未登录无法上传头像' }, { status: 401 });
    }

    const bucket = await getAssetsBucket();
    const extension = resolveFileExtension(file);
    const key = `avatars/${authSession.user.id}/${crypto.randomUUID()}.${extension}`;
    const buffer = await file.arrayBuffer();
    await bucket.put(key, buffer, {
      httpMetadata: {
        contentType: file.type || `image/${extension}`,
      },
    });

    return NextResponse.json<UploadResponse>({ url: await buildAssetUrl(key) });
  } catch (error) {
    console.error('[api/uploads/avatar] 头像上传失败', error);
    const message = error instanceof Error ? error.message : '头像上传失败';
    return NextResponse.json<UploadResponse>({ error: message }, { status: 500 });
  }
}
