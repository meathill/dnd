import { NextResponse } from 'next/server';
import { getAuth } from '../../../lib/auth/auth';
import { getDatabase } from '../../../lib/db/db';
import { getUserSettings } from '../../../lib/db/repositories';
import type { SessionInfo } from '../../../lib/session/session-types';

export async function GET(request: Request) {
  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return NextResponse.json({ session: null });
  }
  try {
    const auth = await getAuth();
    const authSession = await auth.api.getSession({ headers: request.headers });
    if (!authSession?.user) {
      return NextResponse.json({ session: null });
    }
    const userId = authSession.user.id;
    const db = await getDatabase();
    const settings = await getUserSettings(db, userId);
    const session: SessionInfo = {
      userId,
      displayName: authSession.user.name ?? authSession.user.email ?? userId,
      settings,
    };
    return NextResponse.json({ session });
  } catch (error) {
    console.error('[api/session] 会话读取失败', error);
    const message = error instanceof Error ? error.message : '会话读取失败';
    const payload: { error: string; stack?: string } = { error: message };
    if (process.env.NODE_ENV !== 'production' && error instanceof Error && error.stack) {
      payload.stack = error.stack;
    }
    return NextResponse.json(payload, { status: 500 });
  }
}
