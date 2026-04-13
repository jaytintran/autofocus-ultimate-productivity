import type { GroupedTasks } from "./types";
import type { Pamphlet } from "@/lib/types";
import { formatCompletionTime } from "./utils";
import { formatTimeCompact } from "@/lib/utils/time-utils";

export function generateDayMarkdown(
	group: GroupedTasks,
	pamphlets: Pamphlet[],
	activePamphletId?: string | null,
): string {
	const pamphlet = pamphlets.find((p) => p.id === activePamphletId);
	const pamphletLine = pamphlet ? `**${pamphlet.name}**\n` : "";

	const periodEmoji = {
		morning: "🌅",
		afternoon: "☀️",
		evening: "🌙",
	};

	const lines: string[] = [`# ${group.dateLabel}`, pamphletLine].filter(
		Boolean,
	);

	for (const block of group.timeBlocks) {
		lines.push(
			`\n## ${periodEmoji[block.period]} ${block.period.charAt(0).toUpperCase() + block.period.slice(1)}`,
		);

		for (const task of block.tasks) {
			const isLog = (task.source ?? "task") === "log";
			const bullet = isLog ? "-" : "[x]";
			const time = task.completed_at
				? formatCompletionTime(task.completed_at)
				: "";
			const duration =
				task.total_time_ms > 0 ? formatTimeCompact(task.total_time_ms) : "";
			const tag = task.tag ? `#${task.tag}` : "";
			const note = task.note ? ` — _${task.note}_` : "";

			const meta = [time, duration, tag].filter(Boolean).join("  ");
			lines.push(`${bullet} ${task.text}${note ? `  ${meta}` : ""}`);
		}
	}

	return lines.join("\n");
}
