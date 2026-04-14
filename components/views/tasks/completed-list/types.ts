import type { Task, Pamphlet } from "@/lib/types";
import type { TagId } from "@/lib/tags";
import type { CompletedSortKey, CompletedViewType } from "@/components/layout/view-tabs";
import type { ContentFilterState } from "@/lib/features/content-filter";
import type { Sunrise, CloudSun, Moon } from "lucide-react";

export interface CompletedListProps {
	tasks: Task[];
	selectedTags: Set<TagId | "none">;
	completedSort: CompletedSortKey;
	onRefresh: () => Promise<void>;
	onDeleteTask: (taskId: string) => Promise<void>;
	hasMore: boolean;
	isLoadingMore: boolean;
	onLoadMore: () => void;
	completedViewType: CompletedViewType;
	onRevertTask: (task: Task) => Promise<void>;
	onUpdateTaskTag?: (taskId: string, tag: TagId | null) => Promise<void>;
	onUpdateTaskNote?: (taskId: string, note: string | null) => Promise<void>;
	onUpdateTaskText?: (taskId: string, text: string) => Promise<void>;
	onAddLoggedActivity?: (
		text: string,
		tag?: TagId | null,
		note?: string | null,
		completedAt?: string | null,
		source?: "log" | "task",
	) => Promise<Task>;
	contentFilter?: ContentFilterState;
	pamphlets: Pamphlet[];
	activePamphletId?: string | null;
	buJoWidth?: string | null;
	completedSearch?: string;
}

export interface GroupedTasks {
	dateKey: string;
	dateLabel: string;
	tasks: Task[];
	timeBlocks: TimeBlock[];
}

export interface TimeBlock {
	period: "morning" | "afternoon" | "evening";
	label: string;
	icon: typeof Sunrise | typeof CloudSun | typeof Moon;
	tasks: Task[];
}

export interface EntryModalProps {
	task: Task;
	onSave: (
		id: string,
		title: string,
		note: string,
		tag: TagId | null,
		completedAt?: string | null,
		totalTimeMs?: number,
	) => Promise<void>;
	onDelete: (id: string) => Promise<void>;
	onRevert?: (id: string) => Promise<void>;
	onClose: () => void;
}

export interface TaskItemProps {
	task: Task;
	isLoading: boolean;
	loadingTagTaskId: string | null;
	showDeleteConfirm: string | null;
	onSelect: (id: string) => void;
	onRevert: (task: Task) => void;
	onDelete: (id: string) => void;
	onUpdateTag: (taskId: string, tag: TagId | null) => void;
}

export interface TimeBlockSectionProps {
	timeBlock: TimeBlock;
	loadingTaskId: string | null;
	loadingTagTaskId: string | null;
	showDeleteConfirm: string | null;
	onSelectTask: (id: string) => void;
	onRevertTask: (task: Task) => void;
	onDeleteTask: (id: string) => void;
	onUpdateTag: (taskId: string, tag: TagId | null) => void;
	blockKey: string;
	isCollapsed: boolean;
	onToggle: (key: string) => void;
}

export interface DayGroupProps {
	group: GroupedTasks;
	loadingTaskId: string | null;
	loadingTagTaskId: string | null;
	showDeleteConfirm: string | null;
	copiedDateKey: string | null;
	onSelectTask: (id: string) => void;
	onRevertTask: (task: Task) => void;
	onDeleteTask: (id: string) => void;
	onUpdateTag: (taskId: string, tag: TagId | null) => void;
	onExportDay: (group: GroupedTasks) => void;
}

export interface LogActivityBarProps {
	onAddLoggedActivity: (
		text: string,
		tag?: TagId | null,
		note?: string | null,
		completedAt?: string | null,
		source?: "log" | "task",
	) => Promise<Task>;
}
