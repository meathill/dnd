import { createOpencodeClient } from '@opencode-ai/sdk';

export function getOpencodeClient(directory?: string) {
  const baseUrl = process.env.OPENCODE_BASE_URL?.trim() || 'http://127.0.0.1:4096';
  const username = process.env.OPENCODE_SERVER_USERNAME?.trim() || 'opencode';
  const password = process.env.OPENCODE_SERVER_PASSWORD?.trim() || '';
  const headers: Record<string, string> = {};
  if (password) {
    headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }
  return createOpencodeClient({
    baseUrl,
    directory,
    headers,
  });
}
