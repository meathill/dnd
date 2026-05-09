import { NextResponse } from 'next/server';
import { canEdit } from '../auth/permission';
import { getRequestSession } from '../auth/session';
import { resolveAdminEmails } from '../config/runtime';
import { getModuleDraftById } from '../db/module-drafts-repo';
import type { ModuleDraftRecord, SessionInfo } from '../game/types';

export type EditorIdentity = {
  session: SessionInfo;
};

export async function requireEditor(): Promise<EditorIdentity | NextResponse> {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const adminEmails = await resolveAdminEmails();
  if (!canEdit({ email: session.email, role: session.role }, adminEmails)) {
    return NextResponse.json({ error: '需要 editor 权限' }, { status: 403 });
  }
  return { session };
}

export type DraftAccessSuccess = {
  session: SessionInfo;
  draft: ModuleDraftRecord;
};

export async function loadDraftForOwner(id: string): Promise<DraftAccessSuccess | NextResponse> {
  const editor = await requireEditor();
  if (editor instanceof NextResponse) {
    return editor;
  }
  const draft = await getModuleDraftById(id);
  if (!draft) {
    return NextResponse.json({ error: '模组草稿不存在' }, { status: 404 });
  }
  if (draft.ownerUserId !== editor.session.userId && !editor.session.isAdmin) {
    return NextResponse.json({ error: '无权访问该草稿' }, { status: 403 });
  }
  return { session: editor.session, draft };
}
