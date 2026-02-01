import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../admin/manual-signup/route';
import { getAuth } from '@/lib/auth/auth';
import { getCloudflareContext } from '@opennextjs/cloudflare';

vi.mock('@/lib/auth/auth', () => ({
  getAuth: vi.fn(),
}));

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

type AuthApi = {
  signUpEmail: (options: { body: { email: string; name: string; password: string } }) => Promise<{ user: unknown }>;
};

type AuthClient = {
  api: AuthApi;
};

function mockRootPassword(value?: string) {
  vi.mocked(getCloudflareContext).mockResolvedValue({ env: { ROOT_PASSWORD: value } } as {
    env: { ROOT_PASSWORD?: string };
  });
}

function buildRequest(body: unknown, headers?: Record<string, string>) {
  return new Request('http://localhost/api/admin/manual-signup', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/manual-signup', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('缺少 ROOT_PASSWORD 时返回 500', async () => {
    mockRootPassword(undefined);
    const response = await POST(buildRequest({ email: 'test@example.com', name: '测试' }));
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('未配置 ROOT_PASSWORD');
  });

  it('缺少认证头返回 401', async () => {
    mockRootPassword('root-pass');
    const response = await POST(buildRequest({ email: 'test@example.com', name: '测试' }));
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('缺少认证信息');
  });

  it('认证失败返回 401', async () => {
    mockRootPassword('root-pass');
    const response = await POST(
      buildRequest({ email: 'test@example.com', name: '测试' }, { Authentication: 'wrong-pass' }),
    );
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('认证失败');
  });

  it('参数不合法返回 400', async () => {
    mockRootPassword('root-pass');
    const response = await POST(buildRequest({ name: '测试' }, { Authentication: 'root-pass' }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('缺少邮箱');
  });

  it('缺少密码返回 400', async () => {
    mockRootPassword('root-pass');
    const response = await POST(
      buildRequest({ email: 'test@example.com', name: '测试' }, { Authentication: 'root-pass' }),
    );
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('缺少密码');
  });

  it('成功创建用户', async () => {
    mockRootPassword('root-pass');
    const signUpEmail = vi.fn().mockResolvedValue({ user: { id: 'user-1' } });
    const authClient: AuthClient = {
      api: {
        signUpEmail,
      },
    };
    vi.mocked(getAuth).mockResolvedValue(authClient);

    const response = await POST(
      buildRequest({ email: 'test@example.com', name: '测试', password: 'user-pass' }, { Authentication: 'root-pass' }),
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.user).toMatchObject({ id: 'user-1' });
    expect(signUpEmail).toHaveBeenCalledWith({
      body: {
        email: 'test@example.com',
        name: '测试',
        password: 'user-pass',
      },
    });
  });
});
