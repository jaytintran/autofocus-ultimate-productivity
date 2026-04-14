import type { TagId } from "@/lib/tags";
import type { Pamphlet } from "@/lib/types";

export interface CompletedTaskWithNote {
	text: string;
	note: string;
	completed_at: string;
	pamphlet_id: string | null;
	total_time_ms: number;
	tag: TagId | null;
	source?: "log" | "task";
}

export interface PageNavProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	isFiltered?: boolean;
	searchQuery: string;
	onSearchChange: (q: string) => void;
	totalActiveTasks: number;
	taskTagCounts: Record<string, number>;
	completedTasksWithNotes: CompletedTaskWithNote[];
	onRefreshAchievements: () => void;
	pamphlets: Pamphlet[];
	habitsViewActive: boolean;
	onToggleHabitsView: () => void;
	activeHabitCount: number;
	selectedTags: Set<TagId | "none">;
	onToggleTag: (tag: TagId | "none" | "all") => void;
	scheduleViewActive: boolean;
	onToggleScheduleView: () => void;
}

export interface CompassButtonProps {
	completedTasksWithNotes: CompletedTaskWithNote[];
	onRefreshAchievements: () => void;
	pamphlets: Pamphlet[];
}

export type AchievementFilterType = "all" | "tasks" | "logs";
export type AchievementSortKey = "date_desc" | "date_asc" | "time_desc" | "time_asc";
export type AchievementGroupBy = "none" | "date" | "pamphlet" | "tag";

export interface AchievementFilters {
	type: AchievementFilterType;
	search: string;
	pamphletId: string | null;
	tagId: TagId | "none" | null;
	dateRange: "all" | "today" | "week" | "month" | "custom";
	minTimeMs: number;
	sortBy: AchievementSortKey;
	groupBy: AchievementGroupBy;
}
