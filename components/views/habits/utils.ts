import { FolderOpen, type LucideIcon } from "lucide-react";
import { CATEGORY_ICONS } from "./constants";

export function getCategoryIcon(category: string): LucideIcon {
	const lower = category.toLowerCase();
	return CATEGORY_ICONS[lower] ?? FolderOpen;
}

export function formatStreak(streak: number): string {
	if (streak === 0) return "0";
	if (streak === 1) return "1 day";
	return `${streak} days`;
}

export function getWeekDays(): string[] {
	const days = ["S", "M", "T", "W", "T", "F", "S"];
	const now = new Date();
	const currentDay = now.getDay();
	// Reorder so today is last
	const reordered = [];
	for (let i = 6; i >= 0; i--) {
		const idx = (currentDay - i + 7) % 7;
		reordered.push(days[idx]);
	}
	return reordered;
}
