import { mapNodes, sceneClues, sceneFacts, type MapNodeStatus } from "./home-data";

const mapStatusStyles = {
	current: {
		dot: "bg-[var(--accent-ember)]",
		ring: "ring-[rgba(176,74,53,0.45)]",
		label: "text-[var(--accent-ember)]",
	},
	known: {
		dot: "bg-[var(--accent-moss)]",
		ring: "ring-[rgba(61,82,56,0.35)]",
		label: "text-[var(--ink-strong)]",
	},
	unknown: {
		dot: "bg-[var(--ink-soft)]",
		ring: "ring-[rgba(138,125,108,0.35)]",
		label: "text-[var(--ink-soft)]",
	},
} satisfies Record<MapNodeStatus, { dot: string; ring: string; label: string }>;

export default function SceneMapPanel() {
	return <>
		<div className="flex items-center justify-between mb-5">
			<div>
				<p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)]">环境地图</p>
				<h2 className="font-[var(--font-display)] text-2xl text-[var(--ink-strong)]">静默港口</h2>
			</div>
			<span className="rounded-lg border border-[rgba(27,20,12,0.12)] px-3 py-1 text-xs text-[var(--ink-soft)]">
				缩放 1.0x
			</span>
		</div>
		<div
			className="animate-[fade-up_1s_ease-out_both] min-h-[320px] flex gap-4"
			style={{ animationDelay: "0.18s" }}
		>
			<div className="map-surface relative min-h-[240px] flex-1 rounded-xl p-4 flex-1">
				{mapNodes.map((node) => {
					const tone = mapStatusStyles[node.status];
					const pulse = node.status === "current" ? "animate-[slow-glow_4s_ease-in-out_infinite]" : "";
					return (
						<div
							className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
							key={node.id}
							style={{ left: `${node.x}%`, top: `${node.y}%` }}
						>
							<div className={`flex h-8 w-8 items-center justify-center rounded-lg ring-2 ${tone.ring} ${pulse}`}>
								<div className={`h-3 w-3 rounded-lg ${tone.dot}`}></div>
							</div>
							<span
								className={`rounded-lg bg-[rgba(255,255,255,0.75)] px-2 py-1 text-[10px] ${tone.label}`}
							>
								{node.name}
							</span>
						</div>
					);
				})}
			</div>


			<div className="space-y-2 flex-none w-56">
				{sceneFacts.map((fact) => (
					<div className="flex items-center justify-between text-sm" key={fact.label}>
						<span className="text-[var(--ink-soft)]">{fact.label}</span>
						<span className="text-[var(--ink-strong)]">{fact.value}</span>
					</div>
				))}
			</div>
		</div>
	</>;
}
