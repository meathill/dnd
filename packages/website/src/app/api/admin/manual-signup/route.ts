import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getAuth } from '@/lib/auth/auth';

type ManualSignUpPayload = {
  email?: unknown;
  name?: unknown;
  password?: unknown;
};

type ApiErrorLike = {
  statusCode?: unknown;
  status?: unknown;
  body?: unknown;
};

function extractAuthToken(headers: Headers): string {
  const directValue = headers.get('Authentication') ?? headers.get('Authorization') ?? '';
  const trimmed = directValue.trim();
  if (!trimmed) {
    return '';
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('bearer ')) {
    return trimmed.slice(7).trim();
  }
  return trimmed;
}

type ParseResult =
  | { ok: true; value: { email: string; name: string; password: string } }
  | { ok: false; error: string };

function parsePayload(payload: unknown): ParseResult {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: '参数不合法' };
  }
  const data = payload as ManualSignUpPayload;
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  if (!email) {
    return { ok: false, error: '缺少邮箱' };
  }
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const password = typeof data.password === 'string' ? data.password : '';
  if (!password) {
    return { ok: false, error: '缺少密码' };
  }
  const fallbackName = email.split('@')[0]?.trim() || email;
  return {
    ok: true,
    value: {
      email,
      name: name || fallbackName,
      password,
    },
  };
}

function extractErrorStatus(error: ApiErrorLike): number | null {
  if (typeof error.statusCode === 'number') {
    return error.statusCode;
  }
  if (typeof error.status === 'number') {
    return error.status;
  }
  return null;
}

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const body = (error as ApiErrorLike).body;
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return '注册失败';
}

async function resolveRootPassword(): Promise<string> {
  const { env } = await getCloudflareContext({ async: true });
  return env.ROOT_PASSWORD ?? '';
}

export async function POST(request: Request) {
  const rootPassword = await resolveRootPassword();
  if (!rootPassword) {
    return NextResponse.json({ error: '未配置 ROOT_PASSWORD' }, { status: 500 });
  }

  const authToken = extractAuthToken(request.headers);
  if (!authToken) {
    return NextResponse.json({ error: '缺少认证信息' }, { status: 401 });
  }
  if (authToken !== rootPassword) {
    return NextResponse.json({ error: '认证失败' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是有效的 JSON' }, { status: 400 });
  }

  const parsed = parsePayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const auth = await getAuth();
    const result = await auth.api.signUpEmail({
      body: {
        email: parsed.value.email,
        name: parsed.value.name,
        password: parsed.value.password,
      },
    });
    if (result && typeof result === 'object' && 'user' in result) {
      return NextResponse.json({ user: (result as { user: unknown }).user });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/admin/manual-signup] 创建用户失败', error);
    const apiError = error as ApiErrorLike;
    const status = extractErrorStatus(apiError);
    const message = extractErrorMessage(error);
    if (status) {
      return NextResponse.json({ error: message }, { status });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
