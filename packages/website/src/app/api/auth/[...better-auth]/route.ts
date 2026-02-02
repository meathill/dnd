import { toNextJsHandler } from 'better-auth/next-js';
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/auth';
import { resolveAllowSignUp } from '@/lib/auth/signup-policy';

function isSignUpRequest(request: Request): boolean {
  const url = new URL(request.url);
  return url.pathname.includes('/sign-up') || url.pathname.includes('/signUp');
}

export async function GET(request: Request) {
  const auth = await getAuth();
  const handler = toNextJsHandler(auth);
  return handler.GET(request);
}

export async function POST(request: Request) {
  if (isSignUpRequest(request)) {
    const allowSignUp = await resolveAllowSignUp();
    if (!allowSignUp) {
      return NextResponse.json({ error: '当前禁止注册' }, { status: 403 });
    }
  }
  const auth = await getAuth();
  const handler = toNextJsHandler(auth);
  return handler.POST(request);
}
