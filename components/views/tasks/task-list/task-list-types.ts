import type { Pamphlet, Task } from "@/lib/types";
import type { TagId } from "@/lib/tags";

export interface TaskListProps {
	tasks: Task[];
	allTasks: Task[];
	workingTaskId: string | null;
	selectedTags: Set<TagId | "none">;
	onRefresh: () => void;
	onStartTask: (task: Task) => Promise<void>;
	onDoneTask: (task: Task) => Promise<void>;
	onDeleteTask: (taskId: string) => Promise<void>;
	onReenterTask: (task: Task) => Promise<void>;
	onReorderTasks: (
		draggedTaskId: string,
		dropTargetId: string,
	) => Promise<void>;
	onSwitchTask: (
		newTask: Task,
		action: "complete" | "reenter",
	) => Promise<void>;
	onVisibleCapacityChange?: (capacity: number) => void;
	onPumpTask: (taskId: string) => Promise<void>;
	onSinkTask: (taskId: string) => Promise<void>;
	visibleTotalPages: number;
	disableSwipeForWorkingTask?: boolean;
	pamphlets: Pamphlet[];
	activePamphletId: string | null;
	onMoveTask: (taskId: string, toPamphletId: string) => void;
	onUpdateDueDate: (taskId: string, dueDate: string | null) => Promise<void>;
	onUpdateText?: (taskId: string, text: string) => Promise<void>;
}

export interface TaskRowProps {
	task: Task;
	isWorking: boolean;
	workingTask: Task | null;
	onStart: (task: Task) => void;
	onDone: (task: Task) => void;
	onReenter: (task: Task) => void;
	onDelete: (taskId: string) => void;
	onUpdateText: (
		taskId: string,
		newText: string,
		dueDate?: string | null,
	) => void;
	onUpdateTag: (taskId: string, tag: TagId | null) => void;
	onSwitchTask: (
		newTask: Task,
		action: "complete" | "reenter",
	) => Promise<void>;
	disabled: boolean;
	isDragOverlay?: boolean;
	onPumpTask: (taskId: string) => void;
	onSinkTask: (taskId: string) => void;
	isFirst: boolean;
	isLast: boolean;
	disableSwipe?: boolean;
	pamphlets: Pamphlet[];
	activePamphletId: string | null;
	onMoveTask: (taskId: string, toPamphletId: string) => void;
	onUpdateDueDate: (taskId: string, dueDate: string | null) => Promise<void>;
}
