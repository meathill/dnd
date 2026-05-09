import { NextResponse } from 'next/server';
import { listModules } from '@/lib/db/modules-repo';

export async function GET() {
  const modules = await listModules();
  return NextResponse.json({ modules });
}
