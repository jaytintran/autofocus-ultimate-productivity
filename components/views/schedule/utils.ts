import type { Task, TimeBlock } from "@/lib/types";
import {
	PIXELS_PER_MINUTE,
	DAY_START_HOUR,
} from "./constants";
import type { BlockPosition, LayoutedBlock } from "./types";

export function minutesFromMidnight(date: Date): number {
	return date.getHours() * 60 + date.getMinutes();
}

export function timeToY(hour: number, minute: number = 0): number {
	return (
		(hour - DAY_START_HOUR) * 60 * PIXELS_PER_MINUTE +
		minute * PIXELS_PER_MINUTE
	);
}

export function getBlockStyle(block: TimeBlock): BlockPosition {
	const start = new Date(block.start_time);
	const end = new Date(block.end_time);
	const startMinutes = minutesFromMidnight(start);
	const endMinutes = minutesFromMidnight(end);
	const top = (startMinutes - DAY_START_HOUR * 60) * PIXELS_PER_MINUTE;
	const height = (endMinutes - startMinutes) * PIXELS_PER_MINUTE;
	return { top, height };
}

export function computeBlockLayout(blocks: TimeBlock[]): LayoutedBlock[] {
	if (blocks.length === 0) return [];

	const sorted = [...blocks].sort(
		(a, b) =>
			new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
	);

	const result: LayoutedBlock[] = sorted.map((block) => ({
		block,
		column: 0,
		totalColumns: 1,
	}));

	// Find overlapping groups
	const groups: number[][] = [];
	const visited = new Set<number>();

	for (let i = 0; i < sorted.length; i++) {
		if (visited.has(i)) continue;
		const group = [i];
		visited.add(i);
		const groupEnd = () =>
			Math.max(...group.map((idx) => new Date(sorted[idx].end_time).getTime()));

		for (let j = i + 1; j < sorted.length; j++) {
			if (new Date(sorted[j].start_time).getTime() < groupEnd()) {
				group.push(j);
				visited.add(j);
			}
		}
		groups.push(group);
	}

	// Assign columns within each group
	for (const group of groups) {
		const columns: number[][] = [];

		for (const idx of group) {
			const blockStart = new Date(sorted[idx].start_time).getTime();
			const blockEnd = new Date(sorted[idx].end_time).getTime();

			let placed = false;
			for (let col = 0; col < columns.length; col++) {
				const colBlocks = columns[col];
				const lastInCol = colBlocks[colBlocks.length - 1];
				const lastEnd = new Date(sorted[lastInCol].end_time).getTime();
				if (blockStart >= lastEnd) {
					columns[col].push(idx);
					result[idx].column = col;
					placed = true;
					break;
				}
			}

			if (!placed) {
				result[idx].column = columns.length;
				columns.push([idx]);
			}
		}

		const total = columns.length;
		for (const idx of group) {
			result[idx].totalColumns = total;
		}
	}

	return result;
}

export function getTaskScheduledTime(task: Task): Date | null {
	if (!task.scheduled_at) return null;
	return new Date(task.scheduled_at);
}

export function isTaskInBlock(task: Task, block: TimeBlock): boolean {
	const blockStart = new Date(block.start_time);
	const blockEnd = new Date(block.end_time);

	if (task.status === "completed") {
		if (!task.completed_at) return false;
		const completedAt = new Date(task.completed_at);
		return completedAt >= blockStart && completedAt < blockEnd;
	}

	const scheduled = getTaskScheduledTime(task);
	if (!scheduled) return false;
	return scheduled >= blockStart && scheduled < blockEnd;
}
