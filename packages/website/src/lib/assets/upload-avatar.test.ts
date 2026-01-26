import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadAvatar } from './upload-avatar';

const originalFetch = global.fetch;

describe('uploadAvatar', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('成功时返回头像地址', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ url: 'https://assets.example.com/avatars/avatar.png' }),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const url = await uploadAvatar(file);

    expect(url).toBe('https://assets.example.com/avatars/avatar.png');
    expect(fetchMock).toHaveBeenCalledWith('/api/uploads/avatar', {
      method: 'POST',
      body: expect.any(FormData),
    });
  });

  it('失败时抛出错误', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: '上传失败' }),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    await expect(uploadAvatar(file)).rejects.toThrow('上传失败');
  });
});
