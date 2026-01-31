import { describe, expect, it, beforeEach, vi } from 'vitest';
import { isRootUser } from '../root';
import { getCloudflareContext } from '@opennextjs/cloudflare';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

type MockEnv = Record<string, string | undefined>;

function mockCloudflareEnv(env: MockEnv) {
  vi.mocked(getCloudflareContext).mockResolvedValue({ env } as { env: MockEnv });
}

describe('isRootUser', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('未配置 root 环境变量时返回 false', async () => {
    mockCloudflareEnv({});
    const result = await isRootUser({ id: 'user-1', email: 'user@example.com' });
    expect(result).toBe(false);
  });

  it('匹配 root 用户 ID', async () => {
    mockCloudflareEnv({ ROOT_USER_IDS: 'user-1, user-2' });
    const result = await isRootUser({ id: 'user-2', email: 'user@example.com' });
    expect(result).toBe(true);
  });

  it('匹配 root 用户邮箱（忽略大小写）', async () => {
    mockCloudflareEnv({ ROOT_USER_EMAILS: 'root@example.com' });
    const result = await isRootUser({ id: 'user-3', email: 'Root@Example.com' });
    expect(result).toBe(true);
  });

  it('支持单个环境变量配置', async () => {
    mockCloudflareEnv({ ROOT_USER_ID: 'solo-id', ROOT_USER_EMAIL: 'solo@example.com' });
    const byId = await isRootUser({ id: 'solo-id', email: 'user@example.com' });
    const byEmail = await isRootUser({ id: 'other', email: 'solo@example.com' });
    expect(byId).toBe(true);
    expect(byEmail).toBe(true);
  });
});
