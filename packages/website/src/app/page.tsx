import AiProviderPanel from "./ai-provider-panel";
import CharacterCardPanel from "./character-card-panel";
import SceneMapPanel from "./scene-map-panel";
import { chatMessages, quickActions, type ChatRole } from "./home-data";

const messageToneStyles = {
	dm: {
		bubble: "bg-[rgba(241,230,214,0.85)]",
		badge: "bg-[var(--accent-moss)]",
	},
	player: {
		bubble: "bg-[rgba(255,255,255,0.82)]",
		badge: "bg-[var(--accent-brass)]",
	},
	system: {
		bubble: "bg-[rgba(46,108,106,0.14)]",
		badge: "bg-[var(--accent-river)]",
	},
} satisfies Record<ChatRole, { bubble: string; badge: string }>;

export default function Home() {
	return (
		<div className="min-h-screen lg:h-screen lg:overflow-hidden grid grid-cols-[15rem_minmax(0,1fr)]">
			<aside
				className="panel-card animate-[fade-up_0.7s_ease-out_both] flex w-full flex-col gap-4 p-4 lg:h-full lg:overflow-hidden"
				style={{ animationDelay: "0.05s" }}
			>
				<div className="space-y-3">
					<p className="text-xs uppercase tracking-[0.3em] text-[var(--ink-soft)]">AI 跑团体验 · COC 模式</p>
					<h1 className="font-[var(--font-accent)] text-3xl text-[var(--ink-strong)] sm:text-4xl">肉团长</h1>
					<p className="text-sm text-[var(--ink-muted)]">
						游戏外控制台，管理房间、成员与模型设置，随时切回冒险现场。
					</p>
				</div>

				<div className="space-y-3">
					<p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">游戏大厅</p>
					<button
						className="w-full rounded-xl bg-[var(--accent-brass)] px-4 py-2 text-sm text-white shadow-[0_12px_30px_-18px_var(--accent-brass)] transition hover:-translate-y-0.5"
						type="button"
					>
						创建游戏
					</button>
					<div className="grid grid-cols-2 gap-3">
						<button
							className="rounded-xl border border-[var(--ring-soft)] bg-[rgba(255,255,255,0.7)] px-3 py-2 text-xs text-[var(--ink-strong)]"
							disabled
							type="button"
						>
							登入
						</button>
						<button
							className="rounded-xl border border-[var(--ring-soft)] bg-[rgba(255,255,255,0.7)] px-3 py-2 text-xs text-[var(--ink-strong)]"
							disabled
							type="button"
						>
							登出
						</button>
					</div>
					<button
						className="w-full rounded-xl border border-[var(--ring-soft)] bg-[rgba(255,255,255,0.7)] px-3 py-2 text-xs text-[var(--ink-strong)]"
						disabled
						type="button"
					>
						设置
					</button>
					<p className="text-xs text-[var(--ink-soft)]">登入/登出/设置功能后续接入。</p>
				</div>

				<div className="flex min-h-0 flex-1 flex-col gap-4 lg:overflow-y-auto lg:pr-2">
					<AiProviderPanel />

					<div className="rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-4 text-xs text-[var(--ink-muted)]">
						<p className="font-semibold text-[var(--ink-strong)]">控制台状态</p>
						<p className="mt-2">房间：未创建 · 成员：0 · 版本：Alpha 预览</p>
					</div>
				</div>
			</aside>
			<div className="grid h-full gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_20rem] overflow-hidden">
				<main
					className="panel-card animate-[fade-up_0.8s_ease-out_both] flex h-full flex-col rounded-xl p-4"
					style={{ animationDelay: "0.1s" }}
				>
					<SceneMapPanel />
					<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pt-4">
						{chatMessages.map((message) => {
							const styles = messageToneStyles[message.role];
							const align = message.role === "player" ? "items-end" : "items-start";
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
									<button
										className="rounded-lg bg-[var(--accent-brass)] px-4 py-1.5 text-xs text-white"
										type="button"
									>
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
		</div>
	);
}
