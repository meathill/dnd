import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '../../../../lib/auth/auth';

export async function GET(request: Request) {
  const auth = await getAuth();
  const handler = toNextJsHandler((auth as { handler?: unknown }).handler ?? auth);
  return handler.GET(request);
}

export async function POST(request: Request) {
  const auth = await getAuth();
  const handler = toNextJsHandler((auth as { handler?: unknown }).handler ?? auth);
  return handler.POST(request);
}
