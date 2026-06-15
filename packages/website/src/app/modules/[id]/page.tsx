import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Card } from '@/components/card';
import { StartGameForm } from '@/components/start-game-form';
import { getRequestSession } from '@/lib/auth/session';
import { listCharactersByModuleId } from '@/lib/db/characters-repo';
import { getModuleById } from '@/lib/db/modules-repo';

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
  const overview = background && 'overview' in background ? String(background.overview ?? '') : '';

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-zinc-500" aria-label="面包屑">
        <Link className="hover:text-zinc-900" href="/">
          模组库
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-zinc-700">{moduleRecord.title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                <Chip>{moduleRecord.difficulty}</Chip>
                <span>·</span>
                <span>{moduleRecord.setting}</span>
              </div>
              <h1 className="text-3xl font-semibold text-zinc-950">{moduleRecord.title}</h1>
              <p className="text-base leading-7 text-zinc-700">{moduleRecord.summary}</p>
            </div>
          </Card>

          {openingMessages.length > 0 ? (
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold text-zinc-950">开场氛围</h2>
              <div className="space-y-3">
                {openingMessages.map((message, index) => (
                  <p
                    className="rounded-xl bg-zinc-50 p-4 text-sm leading-7 text-zinc-700"
                    key={`opening-${index}-${String(message.content ?? '').slice(0, 16)}`}
                  >
                    {String(message.content ?? '')}
                  </p>
                ))}
              </div>
            </Card>
          ) : null}

          {overview ? (
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold text-zinc-950">背景概览</h2>
              <p className="text-sm leading-7 text-zinc-700">{overview}</p>
            </Card>
          ) : null}
        </div>

        <Card className="space-y-5 lg:sticky lg:top-24">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">开始游戏</p>
            <h2 className="text-xl font-semibold text-zinc-950">选择人物卡</h2>
            <p className="text-sm text-zinc-500">确认后会进入统一游戏运行页，按回合扣费。</p>
          </div>
          <StartGameForm characters={characters} moduleId={moduleRecord.id} />
        </Card>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
      {children}
    </span>
  );
}
