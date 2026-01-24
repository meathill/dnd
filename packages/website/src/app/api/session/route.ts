import { NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/db/db';
import { getUserSettings } from '../../../lib/db/repositories';
import type { SessionInfo } from '../../../lib/session/session-types';

function getUserId(request: Request): string | null {
  const headerUserId = request.headers.get('x-user-id');
  if (headerUserId && headerUserId.trim()) {
    return headerUserId.trim();
  }
  const cookie = request.headers.get('cookie') ?? '';
  const parts = cookie.split(';').map((item) => item.trim());
  const userEntry = parts.find((item) => item.startsWith('user_id='));
  if (!userEntry) {
    return null;
  }
  const value = userEntry.split('=')[1];
  return value ? decodeURIComponent(value) : null;
}

export async function GET(request: Request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ session: null });
  }

  try {
    const db = await getDatabase();
    const settings = await getUserSettings(db, userId);
    const session: SessionInfo = {
      userId,
      displayName: userId,
      settings,
    };
    return NextResponse.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : '会话读取失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
