import type { Project } from "@/lib/db/projects";
import type { LucideIcon } from "lucide-react";
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON, PRIORITY_CONFIG } from "./constants";

export function getCategoryIcon(category: string): LucideIcon {
	const lower = category.toLowerCase();
	return CATEGORY_ICONS[lower] ?? DEFAULT_CATEGORY_ICON;
}

export function sortByPriority(a: Project, b: Project): number {
	const pa = PRIORITY_CONFIG[a.priority ?? "LOW"]?.order ?? 99;
	const pb = PRIORITY_CONFIG[b.priority ?? "LOW"]?.order ?? 99;
	return pa - pb || a.title.localeCompare(b.title);
}

export function formatDueDate(dateStr: string | null): string | null {
	if (!dateStr) return null;
	const d = new Date(dateStr);
	const now = new Date();
	const diff = d.getTime() - now.getTime();
	const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
	if (days < 0) return `${Math.abs(days)}d overdue`;
	if (days === 0) return "Due today";
	if (days === 1) return "Due tomorrow";
	if (days <= 7) return `${days}d left`;
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
