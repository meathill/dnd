import { NextResponse } from 'next/server';
import { getModuleById, listCharactersByModuleId } from '@/lib/db/repositories';

type ModuleRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: ModuleRouteProps) {
  const { id } = await params;
  const [moduleRecord, characters] = await Promise.all([getModuleById(id), listCharactersByModuleId(id)]);
  if (!moduleRecord) {
    return NextResponse.json({ error: '模组不存在' }, { status: 404 });
  }
  return NextResponse.json({ module: moduleRecord, characters });
}
