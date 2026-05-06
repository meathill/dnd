import { notFound, redirect } from 'next/navigation';
import { Card } from '@/components/card';
import { StartGameForm } from '@/components/start-game-form';
import { getRequestSession } from '@/lib/auth/session';
import { getModuleById, listCharactersByModuleId } from '@/lib/db/repositories';

type ModulePageProps = {
  params: Promise<{ id: string }>;
};

export default async function ModuleDetailPage({ params }: ModulePageProps) {
  const session = await getRequestSession();
  if (!session) {
    redirect('/login');
  }
  const { id } = await params;
  const [moduleRecord, characters] = await Promise.all([getModuleById(id), listCharactersByModuleId(id)]);
  if (!moduleRecord) {
    notFound();
  }

  const data = moduleRecord.data;
  const openingMessages = Array.isArray(data.openingMessages) ? data.openingMessages : [];
  const background = typeof data.background === 'object' && data.background ? data.background : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">模组摘要</p>
          <h1 className="text-3xl font-semibold text-zinc-950">{moduleRecord.title}</h1>
          <p className="text-sm text-zinc-600">{moduleRecord.setting}</p>
          <p className="text-base leading-7 text-zinc-700">{moduleRecord.summary}</p>
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-zinc-950">开场氛围</h2>
          <div className="space-y-3">
            {openingMessages.map((message) => (
              <div
                className="rounded-xl bg-zinc-100 p-4 text-sm leading-7 text-zinc-700"
                key={`${String(message.role ?? 'message')}:${String(message.speaker ?? '')}:${String(message.content ?? '')}`}
              >
                {String(message.content ?? '')}
              </div>
            ))}
          </div>
        </div>
        {background && typeof background === 'object' && 'overview' in background ? (
          <div className="space-y-3">
            <h2 className="text-lg font-medium text-zinc-950">背景概览</h2>
            <p className="text-sm leading-7 text-zinc-700">{String(background.overview ?? '')}</p>
          </div>
        ) : null}
      </Card>
      <Card className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">开始游戏</p>
          <h2 className="text-2xl font-semibold text-zinc-950">选择人物卡</h2>
          <p className="text-sm text-zinc-600">确认之后，网站会读取模组详情并交给 opencode 创建新的游戏区。</p>
        </div>
        <StartGameForm characters={characters} moduleId={moduleRecord.id} />
      </Card>
    </div>
  );
}
