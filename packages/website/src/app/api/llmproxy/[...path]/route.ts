import { NextResponse } from 'next/server';
import { isInternalServiceBindingRequest } from '@/lib/internal/request-auth';
import { getBearerToken, getInternalServiceTokens, isInternalServiceTokenValid } from '@/lib/internal/service-token';

const HOP_BY_HOP_HEADERS = new Set([
  'authorization',
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

type LlmProxyRouteProps = {
  params: Promise<{ path: string[] }>;
};

function parseAllowedModels(): string[] {
  const raw = process.env.LLM_PROXY_ALLOWED_MODELS?.trim();
  if (!raw) {
    return [];
  }
  return raw
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildUpstreamUrl(pathSegments: ReadonlyArray<string>, requestUrl: string): string | null {
  const baseUrl = process.env.LLM_PROXY_UPSTREAM_BASE_URL?.trim();
  if (!baseUrl) {
    return null;
  }
  const upstreamUrl = new URL(pathSegments.join('/'), `${baseUrl.replace(/\/+$/, '')}/`);
  const current = new URL(requestUrl);
  upstreamUrl.search = current.search;
  return upstreamUrl.toString();
}

function buildUpstreamHeaders(request: Request): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalizedKey) || normalizedKey.startsWith('x-muir-')) {
      return;
    }
    headers.set(key, value);
  });
  const upstreamApiKey = process.env.LLM_PROXY_UPSTREAM_API_KEY?.trim();
  if (upstreamApiKey) {
    headers.set('Authorization', `Bearer ${upstreamApiKey}`);
  }
  return headers;
}

function buildClientResponse(upstreamResponse: Response): Response {
  const headers = new Headers();
  upstreamResponse.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      return;
    }
    headers.set(key, value);
  });
  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}

function requireContextHeaders(request: Request): string | null {
  const userId = request.headers.get('x-muir-user-id')?.trim();
  const gameId = request.headers.get('x-muir-game-id')?.trim();
  if (!userId || !gameId) {
    return '缺少游戏上下文';
  }
  return null;
}

function validateInternalServiceRequest(request: Request): NextResponse | null {
  if (isInternalServiceBindingRequest(request)) {
    return null;
  }
  if (getInternalServiceTokens().length === 0) {
    return NextResponse.json({ error: '内部服务鉴权未配置' }, { status: 503 });
  }
  const bearerToken = getBearerToken(request.headers.get('authorization'));
  if (!bearerToken) {
    return NextResponse.json({ error: '缺少内部服务凭证' }, { status: 401 });
  }
  if (!isInternalServiceTokenValid(bearerToken)) {
    return NextResponse.json({ error: '内部服务凭证无效' }, { status: 403 });
  }
  return null;
}

async function proxyRequest(request: Request, { params }: LlmProxyRouteProps) {
  const authError = validateInternalServiceRequest(request);
  if (authError) {
    return authError;
  }

  const upstreamUrl = buildUpstreamUrl((await params).path, request.url);
  if (!upstreamUrl) {
    return NextResponse.json({ error: 'LLM 上游未配置' }, { status: 503 });
  }

  const method = request.method.toUpperCase();
  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    const contextError = requireContextHeaders(request);
    if (contextError) {
      return NextResponse.json({ error: contextError }, { status: 400 });
    }
    body = await request.text();
    if (!body) {
      return NextResponse.json({ error: '请求体不能为空' }, { status: 400 });
    }

    const allowedModels = parseAllowedModels();
    if (allowedModels.length > 0) {
      let payload: unknown;
      try {
        payload = JSON.parse(body) as unknown;
      } catch {
        return NextResponse.json({ error: 'LLM 请求体必须是 JSON' }, { status: 400 });
      }
      const model =
        typeof payload === 'object' && payload && 'model' in payload && typeof payload.model === 'string'
          ? payload.model.trim()
          : '';
      if (!model) {
        return NextResponse.json({ error: '缺少模型标识' }, { status: 400 });
      }
      if (!allowedModels.includes(model)) {
        return NextResponse.json({ error: '模型未开放' }, { status: 403 });
      }
    }
  }

  const upstreamResponse = await fetch(upstreamUrl, {
    method,
    headers: buildUpstreamHeaders(request),
    body,
  });

  return buildClientResponse(upstreamResponse);
}

export async function GET(request: Request, props: LlmProxyRouteProps) {
  return proxyRequest(request, props);
}

export async function POST(request: Request, props: LlmProxyRouteProps) {
  return proxyRequest(request, props);
}
