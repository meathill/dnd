export async function uploadAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/uploads/avatar', {
    method: 'POST',
    body: formData,
  });
  const data = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !data.url) {
    throw new Error(data.error ?? '头像上传失败');
  }
  return data.url;
}

export async function generateAvatar(prompt: string): Promise<string> {
  const response = await fetch('/api/uploads/avatar/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const data = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !data.url) {
    throw new Error(data.error ?? '头像生成失败');
  }
  return data.url;
}
