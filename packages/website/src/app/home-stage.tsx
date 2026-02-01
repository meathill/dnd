import type { ScriptDefinition } from '../lib/game/types';
import { Button } from '../components/ui/button';

const sectionTitleClassName = 'text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]';

export type HomeStageProps = {
  scripts: ScriptDefinition[];
  onSelectScript: (scriptId: string) => void;
  statusMessage?: string;
};

export default function HomeStage({ scripts, onSelectScript, statusMessage }: HomeStageProps) {
  return (
    <section className="panel-card flex flex-col gap-4 p-3 sm:p-4 lg:h-full">
      <div>
        <p className={sectionTitleClassName}>首页</p>
        <h2 className="text-xl font-semibold text-[var(--ink-strong)]">剧本列表</h2>
        <p className="text-sm text-[var(--ink-muted)]">选择一个剧本查看详情与建卡入口。</p>
        {statusMessage ? <p className="mt-2 text-xs text-[var(--accent-ember)]">{statusMessage}</p> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {scripts.map((script) => (
          <div
            className="rounded-xl border border-[rgba(27,20,12,0.1)] bg-[rgba(255,255,255,0.7)] p-4 text-sm"
            key={script.id}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--ink-strong)]">{script.title}</p>
                <p className="text-xs text-[var(--ink-soft)]">{script.setting}</p>
              </div>
              <span className="rounded-lg border border-[rgba(27,20,12,0.12)] px-2 py-1 text-[10px] text-[var(--ink-soft)]">
                {script.difficulty}
              </span>
            </div>
            <p className="mt-2 text-xs text-[var(--ink-muted)]">{script.summary}</p>
            <div className="mt-3 grid gap-2 text-xs text-[var(--ink-soft)]">
              <div>
                <span className="font-semibold text-[var(--ink-strong)]">场景：</span>
                {script.scenes.map((scene) => scene.title).join(' / ')}
              </div>
              <div>
                <span className="font-semibold text-[var(--ink-strong)]">战斗：</span>
                {script.encounters.map((encounter) => encounter.title).join(' / ')}
              </div>
            </div>
            <Button className="mt-4 w-full" onClick={() => onSelectScript(script.id)} size="sm" variant="outline">
              查看剧本
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
