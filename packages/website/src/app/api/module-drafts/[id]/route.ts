import { NextResponse } from 'next/server';
import { deleteModuleDraft, updateModuleDraftMeta } from '@/lib/db/module-drafts-repo';
import { loadDraftForOwner } from '@/lib/internal/draft-auth';

type PatchDraftRequest = {
  title?: string;
  summary?: string;
  setting?: string;
  difficulty?: string;
  meta?: Record<string, unknown>;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const access = await loadDraftForOwner(id);
  if (access instanceof NextResponse) {
    return access;
  }
  return NextResponse.json({ draft: access.draft });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const access = await loadDraftForOwner(id);
  if (access instanceof NextResponse) {
    return access;
  }
  let body: PatchDraftRequest;
  try {
    body = (await request.json()) as PatchDraftRequest;
  } catch {
    return NextResponse.json({ error: '无效请求体' }, { status: 400 });
  }
  const updated = await updateModuleDraftMeta({
    id,
    title: body.title?.trim(),
    summary: body.summary?.trim(),
    setting: body.setting?.trim(),
    difficulty: body.difficulty?.trim(),
    meta: body.meta,
  });
  return NextResponse.json({ draft: updated });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const access = await loadDraftForOwner(id);
  if (access instanceof NextResponse) {
    return access;
  }
  if (access.draft.status === 'published') {
    return NextResponse.json({ error: '已发布的草稿不能删除' }, { status: 400 });
  }
  await deleteModuleDraft(id);
  return NextResponse.json({ ok: true });
}
