import { NextResponse } from 'next/server';
import { getPlaySession } from '@/lib/play/session';

export async function GET() {
  const session = await getPlaySession();
  return NextResponse.json({ session });
}
