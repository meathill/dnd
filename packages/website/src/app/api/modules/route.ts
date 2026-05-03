import { NextResponse } from 'next/server';
import { listModules } from '@/lib/db/repositories';

export async function GET() {
  const modules = await listModules();
  return NextResponse.json({ modules });
}
