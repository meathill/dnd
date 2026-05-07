import { createOpencodeClient } from '@opencode-ai/sdk';

export function getOpencodeClient(directory?: string) {
  const baseUrl = process.env.OPENCODE_BASE_URL?.trim() || 'http://127.0.0.1:4096';
  const accessClientId = process.env.OPENCODE_ACCESS_CLIENT_ID?.trim();
  const accessClientSecret = process.env.OPENCODE_ACCESS_CLIENT_SECRET?.trim();
  const headers: Record<string, string> = {};
  if (accessClientId && accessClientSecret) {
    headers['CF-Access-Client-Id'] = accessClientId;
    headers['CF-Access-Client-Secret'] = accessClientSecret;
  }
  return createOpencodeClient({
    baseUrl,
    directory,
    headers,
  });
}
