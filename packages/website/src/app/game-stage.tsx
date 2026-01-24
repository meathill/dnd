'use client';

import CharacterCardPanel from './character-card-panel';
import SceneMapPanel from './scene-map-panel';
import { chatMessages, quickActions, type ChatRole } from './home-data';

const messageToneStyles = {
  dm: {
    bubble: 'bg-[rgba(241,230,214,0.85)]',
    badge: 'bg-[var(--accent-moss)]',
  },
  player: {
    bubble: 'bg-[rgba(255,255,255,0.82)]',
    badge: 'bg-[var(--accent-brass)]',
  },
  system: {
    bubble: 'bg-[rgba(46,108,106,0.14)]',
    badge: 'bg-[var(--accent-river)]',
  },
} satisfies Record<ChatRole, { bubble: string; badge: string }>;

export default function GameStage() {
  return (
    <div className="grid h-full gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_20rem] overflow-hidden">
      <main
        className="panel-card animate-[fade-up_0.8s_ease-out_both] flex h-full flex-col rounded-xl p-4"
        style={{ animationDelay: '0.1s' }}
      >
        <SceneMapPanel />
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pt-4">
          {chatMessages.map((message) => {
            const styles = messageToneStyles[message.role];
            const align = message.role === 'player' ? 'items-end' : 'items-start';
            return (
              <div className={`flex flex-col gap-2 ${align}`} key={message.id}>
                <div className="flex items-center gap-2 text-xs text-[var(--ink-soft)]">
                  <span className={`rounded-lg px-2 py-0.5 text-[10px] text-white ${styles.badge}`}>
                    {message.speaker}
                  </span>
                  <span className="text-[var(--ink-soft)]">{message.time}</span>
                </div>
                <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm text-[var(--ink-strong)] ${styles.bubble}`}>
                  <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[rgba(27,20,12,0.08)] pt-4">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                className="rounded-lg border border-[rgba(27,20,12,0.12)] px-3 py-1 text-xs text-[var(--ink-muted)] transition hover:-translate-y-0.5 hover:border-[var(--accent-brass)]"
                key={action}
                type="button"
              >
                {action}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[rgba(27,20,12,0.1)] bg-[rgba(255,255,255,0.6)] p-4">
            <textarea
              className="min-h-[80px] w-full resize-none bg-transparent text-sm text-[var(--ink-strong)] placeholder:text-[var(--ink-soft)] focus:outline-none"
              placeholder="描述你要说的话或采取的行动，肉团长会结合规则做出回应。"
              rows={3}
            ></textarea>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[var(--ink-soft)]">提示：区分“说的话”和“动作”，让叙事更清晰。</p>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-[rgba(27,20,12,0.12)] px-4 py-1.5 text-xs text-[var(--ink-muted)]"
                  type="button"
                >
                  记录回合
                </button>
                <button className="rounded-lg bg-[var(--accent-brass)] px-4 py-1.5 text-xs text-white" type="button">
                  发送指令
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <aside className="flex min-h-0 flex-col gap-4 lg:overflow-y-auto">
        <CharacterCardPanel />
      </aside>
    </div>
  );
}
