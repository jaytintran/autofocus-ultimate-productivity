import { createClient } from "@/lib/supabase/client";
import type { Task, AppState, TaskStatus, Pamphlet } from "@/lib/types";
import { TagId } from "@/lib/tags";
import type { PamphletColor } from "@/lib/pamphlet-colors";

const APP_STATE_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Retrieves all tasks from the database, ordered by page_number then position.
 * @returns {Promise<Task[]>} Array of all tasks
 */
export async function getTasks(): Promise<Task[]> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("tasks")
		.select("*")
		.order("page_number", { ascending: true })
		.order("position", { ascending: true });

	if (error) throw error;
	return data || [];
}

/**
 * Retrieves tasks filtered by specific status, ordered by page_number then position.
 * @param status - The task status to filter by
 * @returns {Promise<Task[]>} Array of matching tasks
 */
export async function getTasksByStatus(status: TaskStatus): Promise<Task[]> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("tasks")
		.select("*")
		.eq("status", status)
		.order("page_number", { ascending: true })
		.order("position", { ascending: true });

	if (error) throw error;
	return data || [];
}

/**
 * Retrieves active and in-progress tasks, ordered by page_number then position.
 * @returns {Promise<Task[]>} Array of active tasks
 */
export async function getActiveTasks(): Promise<Task[]> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("tasks")
		.select("*")
		.in("status", ["active", "in-progress"])
		.order("page_number", { ascending: true })
		.order("position", { ascending: true });

	if (error) throw error;
	return data || [];
}

const COMPLETED_PAGE_SIZE = 50;

/**
 * Retrieves completed tasks for a specific page (paginated), newest first.
 * @param page - Page number for pagination
 * @returns {Promise<Task[]>} Array of completed tasks for the page
 */
export async function getCompletedTasks(page: number = 1): Promise<Task[]> {
	const supabase = createClient();
	const from = (page - 1) * COMPLETED_PAGE_SIZE;
	const to = from + COMPLETED_PAGE_SIZE - 1;

	const { data, error } = await supabase
		.from("tasks")
		.select("*")
		.eq("status", "completed")
		.order("completed_at", { ascending: false })
		.range(from, to);

	if (error) throw error;
	return data || [];
}

/**
 * Gets the total count of completed tasks.
 * @returns {Promise<number>} Count of completed tasks
 */
export async function getCompletedTasksCount(): Promise<number> {
	const supabase = createClient();
	const { count, error } = await supabase
		.from("tasks")
		.select("*", { count: "exact", head: true })
		.eq("status", "completed");

	if (error) throw error;
	return count || 0;
}

export async function getTasksForPage(pageNumber: number): Promise<Task[]> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("tasks")
		.select("*")
		.eq("page_number", pageNumber)
		.in("status", ["active", "in-progress"])
		.order("position", { ascending: true });

	if (error) throw error;
	return data || [];
}

export async function addTask(
	text: string,
	pageNumber: number,
	position: number,
	tag?: TagId | null,
	dueDate?: string | null,
	pamphletId?: string | null,
): Promise<Task> {
	const supabase = createClient();

	// Shift all existing active tasks down by 1
	const { data: existingTasks } = await supabase
		.from("tasks")
		.select("*")
		.in("status", ["active", "in-progress"])
		.order("page_number", { ascending: true })
		.order("position", { ascending: true });

	const PAGE_SIZE = 12;
	const now = new Date().toISOString();

	// Batch update all tasks in parallel
	const updatePromises = (existingTasks || []).map((task, i) => {
		const newPageNumber = Math.floor((i + 1) / PAGE_SIZE) + 1;
		const newPosition = (i + 1) % PAGE_SIZE;

		return supabase
			.from("tasks")
			.update({
				page_number: newPageNumber,
				position: newPosition,
				updated_at: now,
			})
			.eq("id", task.id);
	});

	// Insert new task at position 0
	const insertPromise = supabase
		.from("tasks")
		.insert({
			text,
			page_number: pageNumber,
			position,
			status: "active",
			tag: tag ?? null,
			due_date: dueDate ?? null,
			pamphlet_id: pamphletId ?? null,
		})
		.select()
		.single();

	// Execute all operations in parallel
	const [insertResult] = await Promise.all([insertPromise, ...updatePromises]);

	if (insertResult.error) throw insertResult.error;
	return insertResult.data;
}

export async function addMultipleTasks(
	tasks: Array<{
		text: string;
		pageNumber: number;
		position: number;
		tag?: TagId | null;
		dueDate?: string | null;
		pamphletId?: string | null;
	}>,
): Promise<Task[]> {
	const supabase = createClient();

	// Shift all existing active tasks down
	const { data: existingTasks } = await supabase
		.from("tasks")
		.select("*")
		.in("status", ["active", "in-progress"])
		.order("page_number", { ascending: true })
		.order("position", { ascending: true });

	const PAGE_SIZE = 12;
	const shiftAmount = tasks.length;
	const now = new Date().toISOString();

	// Batch update all tasks in parallel
	const updatePromises = (existingTasks || []).map((task, i) => {
		const newIndex = i + shiftAmount;
		const newPageNumber = Math.floor(newIndex / PAGE_SIZE) + 1;
		const newPosition = newIndex % PAGE_SIZE;

		return supabase
			.from("tasks")
			.update({
				page_number: newPageNumber,
				position: newPosition,
				updated_at: now,
			})
			.eq("id", task.id);
	});

	// Insert new tasks at the top
	const insertPromise = supabase
		.from("tasks")
		.insert(
			tasks.map((t) => ({
				text: t.text,
				page_number: t.pageNumber,
				position: t.position,
				status: "active" as TaskStatus,
				tag: t.tag ?? null,
				due_date: t.dueDate ?? null,
				pamphlet_id: t.pamphletId ?? null,
			})),
		)
		.select();

	// Execute all operations in parallel
	const [insertResult] = await Promise.all([insertPromise, ...updatePromises]);

	if (insertResult.error) throw insertResult.error;
	return insertResult.data || [];
}

export async function updateTask(
	id: string,
	updates: Partial<Task>,
): Promise<Task> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("tasks")
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function completeTask(
	id: string,
	totalTimeMs: number,
	pamphletId?: string | null,
): Promise<Task> {
	const supabase = createClient();

	const { data, error } = await supabase
		.from("tasks")
		.update({
			status: "completed",
			completed_at: new Date().toISOString(),
			total_time_ms: totalTimeMs,
			updated_at: new Date().toISOString(),
		})
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;

	let reindexQuery = supabase
		.from("tasks")
		.select("id, page_number, position")
		.in("status", ["active", "in-progress"]);

	if (pamphletId) reindexQuery = reindexQuery.eq("pamphlet_id", pamphletId);

	const { data: remainingTasks, error: fetchError } = await reindexQuery
		.order("page_number", { ascending: true })
		.order("position", { ascending: true });

	if (fetchError) throw fetchError;
	if (!remainingTasks || remainingTasks.length === 0) return data;

	const PAGE_SIZE = 12;
	const now = new Date().toISOString();

	for (const [index, task] of remainingTasks.entries()) {
		const { error: updateError } = await supabase
			.from("tasks")
			.update({
				page_number: Math.floor(index / PAGE_SIZE) + 1,
				position: index % PAGE_SIZE,
				updated_at: now,
			})
			.eq("id", task.id);

		if (updateError) throw updateError;
	}

	return data;
}

export async function reenterTask(
	originalTaskId: string,
	newText: string,
	pageNumber: number,
	position: number,
	totalTimeMs?: number,
	tag?: TagId | null,
	pamphletId?: string | null,
): Promise<Task> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("tasks")
		.insert({
			text: newText,
			page_number: pageNumber,
			position,
			status: "active",
			total_time_ms: totalTimeMs || 0,
			re_entered_from: originalTaskId,
			tag: tag ?? null,
			pamphlet_id: pamphletId ?? null,
		})
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function deleteTaskOld(id: string): Promise<void> {
	const supabase = createClient();

	const { data: deletedTask, error: fetchError } = await supabase
		.from("tasks")
		.select("page_number, position, status")
		.eq("id", id)
		.single();

	if (fetchError) throw fetchError;

	const { error: deleteError } = await supabase
		.from("tasks")
		.delete()
		.eq("id", id);
	if (deleteError) throw deleteError;

	if (!deletedTask || deletedTask.status === "completed") return;

	// Re-index the full active list (not just from deleted page)
	const { data: remainingTasks, error: reorderFetchError } = await supabase
		.from("tasks")
		.select("id, page_number, position")
		.in("status", ["active", "in-progress"])
		.order("page_number", { ascending: true })
		.order("position", { ascending: true });

	if (reorderFetchError) throw reorderFetchError;
	if (!remainingTasks || remainingTasks.length === 0) return;

	const PAGE_SIZE = 12;
	const now = new Date().toISOString();

	for (const [index, task] of remainingTasks.entries()) {
		const { error } = await supabase
			.from("tasks")
			.update({
				page_number: Math.floor(index / PAGE_SIZE) + 1,
				position: index % PAGE_SIZE,
				updated_at: now,
			})
			.eq("id", task.id);

		if (error) throw error;
	}
}

export async function deleteTask(
	id: string,
	pamphletId?: string | null,
): Promise<void> {
	const supabase = createClient();

	const { data: deletedTask, error: fetchError } = await supabase
		.from("tasks")
		.select("page_number, position, status")
		.eq("id", id)
		.single();

	if (fetchError) throw fetchError;

	const { error: deleteError } = await supabase
		.from("tasks")
		.delete()
		.eq("id", id);

	if (deleteError) throw deleteError;

	if (!deletedTask || deletedTask.status === "completed") return;

	let reindexQuery = supabase
		.from("tasks")
		.select("id, page_number, position")
		.in("status", ["active", "in-progress"]);

	if (pamphletId) reindexQuery = reindexQuery.eq("pamphlet_id", pamphletId);

	const { data: remainingTasks, error: reorderFetchError } = await reindexQuery
		.order("page_number", { ascending: true })
		.order("position", { ascending: true });

	if (reorderFetchError) throw reorderFetchError;
	if (!remainingTasks || remainingTasks.length === 0) return;

	const PAGE_SIZE = 12;
	const now = new Date().toISOString();

	for (const [index, task] of remainingTasks.entries()) {
		const { error } = await supabase
			.from("tasks")
			.update({
				page_number: Math.floor(index / PAGE_SIZE) + 1,
				position: index % PAGE_SIZE,
				updated_at: now,
			})
			.eq("id", task.id);

		if (error) throw error;
	}
}

// App State functions
export async function getAppState(): Promise<AppState> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("app_state")
		.select("*")
		.eq("id", APP_STATE_ID)
		.single();

	if (error) throw error;
	return data;
}

export async function updateAppState(
	updates: Partial<AppState>,
): Promise<AppState> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("app_state")
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq("id", APP_STATE_ID)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function startWorkingOnTask(taskId: string): Promise<AppState> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("app_state")
		.update({
			working_on_task_id: taskId,
			session_start_time: new Date().toISOString(),
			timer_state: "running",
			current_session_ms: 0,
			updated_at: new Date().toISOString(),
		})
		.eq("id", APP_STATE_ID)
		.select()
		.single();

	if (error) throw error;

	// Also update the task status
	await supabase
		.from("tasks")
		.update({ status: "in-progress", updated_at: new Date().toISOString() })
		.eq("id", taskId);

	return data;
}

export async function stopWorkingOnTask(): Promise<AppState> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("app_state")
		.update({
			working_on_task_id: null,
			session_start_time: null,
			timer_state: "idle",
			current_session_ms: 0,
			updated_at: new Date().toISOString(),
		})
		.eq("id", APP_STATE_ID)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function pauseTimer(currentSessionMs: number): Promise<AppState> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("app_state")
		.update({
			timer_state: "paused",
			current_session_ms: currentSessionMs,
			updated_at: new Date().toISOString(),
		})
		.eq("id", APP_STATE_ID)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function stopTimer(
	taskId: string,
	sessionTimeMs: number,
): Promise<{ appState: AppState; task: Task }> {
	const supabase = createClient();

	// First get the current task to add session time to total
	const { data: currentTask, error: taskFetchError } = await supabase
		.from("tasks")
		.select("*")
		.eq("id", taskId)
		.single();

	if (taskFetchError) throw taskFetchError;

	// Update task with accumulated time
	const newTotalTime = (currentTask.total_time_ms || 0) + sessionTimeMs;
	const { data: updatedTask, error: taskUpdateError } = await supabase
		.from("tasks")
		.update({
			total_time_ms: newTotalTime,
			updated_at: new Date().toISOString(),
		})
		.eq("id", taskId)
		.select()
		.single();

	if (taskUpdateError) throw taskUpdateError;

	// Update app state to stopped (keep working_on_task_id)
	const { data: appState, error: appStateError } = await supabase
		.from("app_state")
		.update({
			timer_state: "stopped",
			current_session_ms: 0,
			session_start_time: null,
			updated_at: new Date().toISOString(),
		})
		.eq("id", APP_STATE_ID)
		.select()
		.single();

	if (appStateError) throw appStateError;

	return { appState, task: updatedTask };
}

export async function reenterFromPanel(
	taskId: string,
	taskText: string,
): Promise<Task> {
	const supabase = createClient();

	// Get the max position on the last page
	const activeTasks = await getActiveTasks();
	const maxPage =
		activeTasks.length > 0
			? Math.max(...activeTasks.map((t) => t.page_number))
			: 1;
	const nextPosition = await getNextPosition(maxPage);

	// Get the current task to preserve total_time_ms
	const { data: currentTask, error: fetchError } = await supabase
		.from("tasks")
		.select("total_time_ms")
		.eq("id", taskId)
		.single();

	if (fetchError) throw fetchError;

	// Create new task at end of list with total time carried over
	const { data: newTask, error: insertError } = await supabase
		.from("tasks")
		.insert({
			text: taskText,
			page_number: maxPage,
			position: nextPosition,
			status: "active",
			total_time_ms: currentTask.total_time_ms || 0,
			re_entered_from: taskId,
		})
		.select()
		.single();

	if (insertError) throw insertError;

	// Mark original as completed
	await supabase
		.from("tasks")
		.update({
			status: "completed",
			completed_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq("id", taskId);

	// Clear the panel
	await stopWorkingOnTask();

	return newTask;
}

export async function resumeTimer(): Promise<AppState> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("app_state")
		.update({
			timer_state: "running",
			session_start_time: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq("id", APP_STATE_ID)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function getTotalPageCount(): Promise<number> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("tasks")
		.select("page_number")
		.in("status", ["active", "in-progress"])
		.order("page_number", { ascending: false })
		.limit(1);

	if (error) throw error;
	if (!data || data.length === 0) return 1;
	return data[0].page_number;
}

export async function getNextPosition(pageNumber: number): Promise<number> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("tasks")
		.select("position")
		.eq("page_number", pageNumber)
		.order("position", { ascending: false })
		.limit(1);

	if (error) throw error;
	if (!data || data.length === 0) return 0;
	return data[0].position + 1;
}

export async function reorderTasks(
	updates: Array<{ id: string; page_number: number; position: number }>,
): Promise<void> {
	const supabase = createClient();

	// Update each task's position
	for (const update of updates) {
		const { error } = await supabase
			.from("tasks")
			.update({
				page_number: update.page_number,
				position: update.position,
				updated_at: new Date().toISOString(),
			})
			.eq("id", update.id);

		if (error) throw error;
	}
}

export async function revertTaskLastPosition(taskId: string): Promise<Task> {
	const supabase = createClient();

	const activeTasks = await getActiveTasks();
	const PAGE_SIZE = 12;

	// Compute correct placement respecting page capacity
	const lastPageNumber =
		activeTasks.length > 0
			? Math.max(...activeTasks.map((t) => t.page_number))
			: 1;
	const lastPageTasks = activeTasks.filter(
		(t) => t.page_number === lastPageNumber,
	);

	const pageNumber =
		lastPageTasks.length >= PAGE_SIZE ? lastPageNumber + 1 : lastPageNumber;
	const position = lastPageTasks.length >= PAGE_SIZE ? 0 : lastPageTasks.length;

	const { data, error } = await supabase
		.from("tasks")
		.update({
			status: "active",
			completed_at: null,
			page_number: pageNumber,
			position: position,
			updated_at: new Date().toISOString(),
		})
		.eq("id", taskId)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function revertTaskOld(taskId: string): Promise<Task> {
	const supabase = createClient();
	const PAGE_SIZE = 12;
	const now = new Date().toISOString();

	// Shift all existing active tasks down by 1 to make room at page 1, position 0
	const { data: existingTasks, error: fetchError } = await supabase
		.from("tasks")
		.select("id, page_number, position")
		.in("status", ["active", "in-progress"])
		.order("page_number", { ascending: true })
		.order("position", { ascending: true });

	if (fetchError) throw fetchError;

	for (const [index, task] of (existingTasks || []).entries()) {
		const { error } = await supabase
			.from("tasks")
			.update({
				page_number: Math.floor((index + 1) / PAGE_SIZE) + 1,
				position: (index + 1) % PAGE_SIZE,
				updated_at: now,
			})
			.eq("id", task.id);

		if (error) throw error;
	}

	// Place the reverted task at page 1, position 0
	const { data, error } = await supabase
		.from("tasks")
		.update({
			status: "active",
			completed_at: null,
			page_number: 1,
			position: 0,
			updated_at: now,
		})
		.eq("id", taskId)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function revertTask(
	taskId: string,
	pamphletId?: string | null,
): Promise<Task> {
	const supabase = createClient();
	const PAGE_SIZE = 12;
	const now = new Date().toISOString();

	let reindexQuery = supabase
		.from("tasks")
		.select("id, page_number, position")
		.in("status", ["active", "in-progress"]);

	if (pamphletId) reindexQuery = reindexQuery.eq("pamphlet_id", pamphletId);

	const { data: existingTasks, error: fetchError } = await reindexQuery
		.order("page_number", { ascending: true })
		.order("position", { ascending: true });

	if (fetchError) throw fetchError;

	for (const [index, task] of (existingTasks || []).entries()) {
		const { error } = await supabase
			.from("tasks")
			.update({
				page_number: Math.floor((index + 1) / PAGE_SIZE) + 1,
				position: (index + 1) % PAGE_SIZE,
				updated_at: now,
			})
			.eq("id", task.id);

		if (error) throw error;
	}

	const { data, error } = await supabase
		.from("tasks")
		.update({
			status: "active",
			completed_at: null,
			page_number: 1,
			position: 0,
			updated_at: now,
		})
		.eq("id", taskId)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function markTaskDoneOld(
	taskId: string,
	totalTimeMs: number = 0,
): Promise<Task> {
	const supabase = createClient();

	// 1. Mark the task as done
	const { data, error } = await supabase
		.from("tasks")
		.update({
			status: "completed",
			completed_at: new Date().toISOString(),
			total_time_ms: totalTimeMs,
			updated_at: new Date().toISOString(),
		})
		.eq("id", taskId)
		.select()
		.single();

	if (error) throw error;

	// 2. Fetch ALL remaining active tasks (both active and in-progress)
	const { data: remainingTasks, error: fetchError } = await supabase
		.from("tasks")
		.select("id, page_number, position")
		.in("status", ["active", "in-progress"])
		.order("page_number", { ascending: true })
		.order("position", { ascending: true });

	if (fetchError) throw fetchError;

	if (!remainingTasks || remainingTasks.length === 0) return data;

	// 3. Re-index them contiguously from page 1
	const PAGE_SIZE = 12;
	const now = new Date().toISOString();
	const updates = remainingTasks.map((task, index) => ({
		id: task.id,
		page_number: Math.floor(index / PAGE_SIZE) + 1,
		position: index % PAGE_SIZE,
		updated_at: now,
	}));

	// 4. Upsert the re-indexed positions back
	for (const update of updates) {
		const { error: updateError } = await supabase
			.from("tasks")
			.update({
				page_number: update.page_number,
				position: update.position,
				updated_at: update.updated_at,
			})
			.eq("id", update.id);

		if (updateError) throw updateError;
	}

	return data;
}

export async function markTaskDone(
	taskId: string,
	totalTimeMs: number = 0,
	pamphletId?: string | null,
): Promise<Task> {
	const supabase = createClient();

	const { data, error } = await supabase
		.from("tasks")
		.update({
			status: "completed",
			completed_at: new Date().toISOString(),
			total_time_ms: totalTimeMs,
			updated_at: new Date().toISOString(),
		})
		.eq("id", taskId)
		.select()
		.single();

	if (error) throw error;

	let reindexQuery = supabase
		.from("tasks")
		.select("id, page_number, position")
		.in("status", ["active", "in-progress"]);

	if (pamphletId) reindexQuery = reindexQuery.eq("pamphlet_id", pamphletId);

	const { data: remainingTasks, error: fetchError } = await reindexQuery
		.order("page_number", { ascending: true })
		.order("position", { ascending: true });

	if (fetchError) throw fetchError;
	if (!remainingTasks || remainingTasks.length === 0) return data;

	const PAGE_SIZE = 12;
	const now = new Date().toISOString();

	for (const [index, task] of remainingTasks.entries()) {
		const { error: updateError } = await supabase
			.from("tasks")
			.update({
				page_number: Math.floor(index / PAGE_SIZE) + 1,
				position: index % PAGE_SIZE,
				updated_at: now,
			})
			.eq("id", task.id);

		if (updateError) throw updateError;
	}

	return data;
}

export async function startTask(taskId: string): Promise<AppState> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("app_state")
		.update({
			working_on_task_id: taskId,
			session_start_time: null, // Don't auto-start timer
			timer_state: "idle",
			current_session_ms: 0,
			updated_at: new Date().toISOString(),
		})
		.eq("id", APP_STATE_ID)
		.select()
		.single();

	if (error) throw error;

	// Also update the task status
	await supabase
		.from("tasks")
		.update({ status: "in-progress", updated_at: new Date().toISOString() })
		.eq("id", taskId);

	return data;
}

export async function updateTaskTag(
	taskId: string,
	tag: TagId | null,
): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase
		.from("tasks")
		.update({
			tag,
			updated_at: new Date().toISOString(),
		})
		.eq("id", taskId);

	if (error) throw error;
}

// Add this function to clean up any dismissed tasks
export async function cleanupDismissedTasks(): Promise<void> {
	const supabase = createClient();
	await supabase
		.from("tasks")
		.update({ status: "active", updated_at: new Date().toISOString() })
		.eq("status", "dismissed");
}

export async function getTasksWithNotes(): Promise<Task[]> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("tasks")
		.select("*")
		.eq("status", "completed")
		.not("note", "is", null)
		.neq("note", "")
		.order("completed_at", { ascending: false });

	if (error) throw error;
	return Array.isArray(data) ? data : [];
}

// =============================================================================
// PAMPHLET FUNCTIONS
// =============================================================================

export async function getPamphlets(): Promise<Pamphlet[]> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("pamphlets")
		.select("*")
		.order("position", { ascending: true });

	if (error) throw error;
	return data || [];
}

export async function createPamphlet(
	name: string,
	color: PamphletColor,
	position: number,
): Promise<Pamphlet> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("pamphlets")
		.insert({ name, color, position })
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function updatePamphlet(
	id: string,
	updates: Partial<Pick<Pamphlet, "name" | "color" | "position">>,
): Promise<Pamphlet> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("pamphlets")
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function deletePamphlet(id: string): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("pamphlets").delete().eq("id", id);

	if (error) throw error;
}

export async function reassignPamphletTasks(
	fromPamphletId: string,
	toPamphletId: string,
): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase
		.from("tasks")
		.update({
			pamphlet_id: toPamphletId,
			updated_at: new Date().toISOString(),
		})
		.eq("pamphlet_id", fromPamphletId);

	if (error) throw error;
}

export async function getActiveTasksForPamphlet(
	pamphletId: string,
): Promise<Task[]> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("tasks")
		.select("*")
		.eq("pamphlet_id", pamphletId)
		.in("status", ["active", "in-progress"])
		.order("page_number", { ascending: true })
		.order("position", { ascending: true });

	if (error) throw error;
	return data || [];
}

export async function getCompletedTasksForPamphlet(
	pamphletId: string,
	page: number = 1,
): Promise<Task[]> {
	const supabase = createClient();
	const from = (page - 1) * 50;
	const to = from + 49;

	const { data, error } = await supabase
		.from("tasks")
		.select("*")
		.eq("pamphlet_id", pamphletId)
		.eq("status", "completed")
		.order("completed_at", { ascending: false })
		.range(from, to);

	if (error) throw error;
	return data || [];
}

export async function getTotalPageCountForPamphlet(
	pamphletId: string,
): Promise<number> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("tasks")
		.select("page_number")
		.eq("pamphlet_id", pamphletId)
		.in("status", ["active", "in-progress"])
		.order("page_number", { ascending: false })
		.limit(1);

	if (error) throw error;
	if (!data || data.length === 0) return 1;
	return data[0].page_number;
}

// Move task to another pamphlet
export async function moveTaskToPamphlet(
	taskId: string,
	toPamphletId: string,
): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase
		.from("tasks")
		.update({
			pamphlet_id: toPamphletId,
			updated_at: new Date().toISOString(),
		})
		.eq("id", taskId);

	if (error) throw error;
}

export async function reorderPamphlets(
	updates: Array<{ id: string; position: number }>,
): Promise<void> {
	const supabase = createClient();
	for (const update of updates) {
		const { error } = await supabase
			.from("pamphlets")
			.update({
				position: update.position,
				updated_at: new Date().toISOString(),
			})
			.eq("id", update.id);
		if (error) throw error;
	}
}

// =============================================================================
// LOGGED ACTIVITY FUNCTIONS
// =============================================================================

export async function addLoggedActivity(
	text: string,
	tag?: TagId | null,
	note?: string | null,
	completedAt?: string | null, // allows backdating
	pamphletId?: string | null,
): Promise<Task> {
	const supabase = createClient();
	const now = new Date().toISOString();

	const { data, error } = await supabase
		.from("tasks")
		.insert({
			text,
			status: "completed",
			source: "log",
			completed_at: completedAt ?? now,
			total_time_ms: 0,
			page_number: 1,
			position: 0,
			tag: tag ?? null,
			note: note ?? null,
			pamphlet_id: pamphletId ?? null,
		})
		.select()
		.single();

	if (error) throw error;
	return data;
}
