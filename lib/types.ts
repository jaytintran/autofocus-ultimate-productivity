import { TagId } from "./tags";

export type TaskStatus = "active" | "in-progress" | "completed";
export type TimerState = "idle" | "running" | "paused" | "stopped";
export type DefaultFilter = "all" | "none";

export interface Task {
	id: string;
	text: string;
	status: TaskStatus;
	page_number: number;
	position: number;
	added_at: string;
	completed_at: string | null;
	total_time_ms: number;
	re_entered_from: string | null;
	tag: TagId | null;
	note?: string | null;
	created_at: string;
	updated_at: string;
}

export interface AppState {
	id: string;
	current_page: number;
	page_size: number;
	last_pass_had_no_action: boolean;
	working_on_task_id: string | null;
	session_start_time: string | null;
	timer_state: TimerState;
	current_session_ms: number;
	default_filter: DefaultFilter;
	created_at: string;
	updated_at: string;
}

export interface TaskWithTimer extends Task {
	isWorking: boolean;
}

// =============================================================================
// OPTIMISTIC UPDATE TYPES
// =============================================================================

export interface OptimisticStateSnapshot {
	activeTasks: Task[];
	completedTasks: Task[];
	appState: AppState;
	totalPages: number;
}

export interface PagedTaskLike {
	page_number: number;
	position: number;
}

export interface TaskPlacement {
	pageNumber: number;
	position: number;
}

export interface TaskReorderUpdate {
	id: string;
	page_number: number;
	position: number;
}

export interface AchievementPending {
	task: Task;
	sessionMs: number;
	type: "done" | "complete";
}
