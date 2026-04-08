// store.ts - Optimized for speed
import { createClient } from "@/lib/supabase/client";
import type { Task, AppState, TaskStatus, Pamphlet } from "@/lib/types";
import { TagId } from "@/lib/tags";
import type { PamphletColor } from "@/lib/features/pamphlet-colors";
import { startOfDay, endOfDay } from "date-fns";

// =============================================================================
// TASK FETCHING
// =============================================================================

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

// =============================================================================
// TASK CREATION
// =============================================================================

export async function addTask(
	text: string,
	pageNumber: number,
	position: number,
	tag?: TagId | null,
	dueDate?: string | null,
	pamphletId?: string | null,
): Promise<Task> {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const PAGE_SIZE = 12;
	const now = new Date().toISOString();

	// Fetch and shift in parallel
	const [existingResult, insertResult] = await Promise.all([
		supabase
			.from("tasks")
			.select("*")
			.in("status", ["active", "in-progress"])
			.order("page_number", { ascending: true })
			.order("position", { ascending: true }),
		supabase
			.from("tasks")
			.insert({
				text,
				page_number: pageNumber,
				position,
				status: "active",
				tag: tag ?? null,
				due_date: dueDate ?? null,
				pamphlet_id: pamphletId ?? null,
				user_id: user.id,
			})
			.select()
			.single(),
	]);

	if (insertResult.error) throw insertResult.error;

	// Background reindex - don't block return
	const existingTasks = existingResult.data || [];
	if (existingTasks.length > 0) {
		Promise.all(
			existingTasks.map((task, i) => {
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
			}),
		).catch(console.error); // Fire and forget, log errors
	}

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
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const PAGE_SIZE = 12;
	const shiftAmount = tasks.length;
	const now = new Date().toISOString();

	// Fetch and insert in parallel
	const [existingResult, insertResult] = await Promise.all([
		supabase
			.from("tasks")
			.select("*")
			.in("status", ["active", "in-progress"])
			.order("page_number", { ascending: true })
			.order("position", { ascending: true }),
		supabase
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
					user_id: user.id,
				})),
			)
			.select(),
	]);

	if (insertResult.error) throw insertResult.error;

	// Background reindex
	const existingTasks = existingResult.data || [];
	if (existingTasks.length > 0) {
		Promise.all(
			existingTasks.map((task, i) => {
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
			}),
		).catch(console.error);
	}

	return insertResult.data || [];
}

// =============================================================================
// TASK UPDATES
// =============================================================================

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

// =============================================================================
// TASK COMPLETION - OPTIMIZED
// =============================================================================

export async function completeTask(
	id: string,
	totalTimeMs: number,
	pamphletId?: string | null,
): Promise<Task> {
	const supabase = createClient();
	const now = new Date().toISOString();

	const { data, error } = await supabase
		.from("tasks")
		.update({
			status: "completed",
			completed_at: now,
			total_time_ms: totalTimeMs,
			updated_at: now,
		})
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;

	// Background reindex - don't await
	reindexActiveTasks(pamphletId).catch(console.error);

	return data;
}

export async function markTaskDone(
	taskId: string,
	totalTimeMs: number = 0,
	pamphletId?: string | null,
): Promise<Task> {
	const supabase = createClient();
	const now = new Date().toISOString();

	const { data, error } = await supabase
		.from("tasks")
		.update({
			status: "completed",
			completed_at: now,
			total_time_ms: totalTimeMs,
			updated_at: now,
		})
		.eq("id", taskId)
		.select()
		.single();

	if (error) throw error;

	// Background reindex
	reindexActiveTasks(pamphletId).catch(console.error);

	return data;
}

// =============================================================================
// RE-ENTER TASK - OPTIMIZED
// =============================================================================

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
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const now = new Date().toISOString();

	// Complete original and insert new in parallel
	const [insertResult] = await Promise.all([
		supabase
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
				user_id: user.id,
			})
			.select()
			.single(),
		supabase
			.from("tasks")
			.update({
				status: "completed",
				completed_at: now,
				updated_at: now,
			})
			.eq("id", originalTaskId),
	]);

	if (insertResult.error) throw insertResult.error;

	// Background reindex
	reindexActiveTasks(pamphletId).catch(console.error);

	return insertResult.data;
}

export async function reenterFromPanel(
	taskId: string,
	taskText: string,
): Promise<Task> {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const now = new Date().toISOString();

	// Get current task data and clear panel in parallel
	const [currentTaskResult, clearPanelResult] = await Promise.all([
		supabase
			.from("tasks")
			.select("total_time_ms, tag, pamphlet_id")
			.eq("id", taskId)
			.single(),
		supabase
			.from("app_state")
			.update({
				working_on_task_id: null,
				session_start_time: null,
				timer_state: "idle",
				current_session_ms: 0,
				updated_at: now,
			})
			.eq("user_id", user.id),
	]);

	if (currentTaskResult.error) throw currentTaskResult.error;
	if (clearPanelResult.error) throw clearPanelResult.error;

	const currentTask = currentTaskResult.data;

	// Get position for new task
	const activeTasks = await getActiveTasks();
	const maxPage =
		activeTasks.length > 0
			? Math.max(...activeTasks.map((t) => t.page_number))
			: 1;
	const nextPosition = await getNextPosition(maxPage);

	// Insert new task and mark old complete in parallel
	const [insertResult] = await Promise.all([
		supabase
			.from("tasks")
			.insert({
				text: taskText,
				page_number: maxPage,
				position: nextPosition,
				status: "active",
				total_time_ms: currentTask.total_time_ms || 0,
				re_entered_from: taskId,
				tag: currentTask.tag ?? null,
				pamphlet_id: currentTask.pamphlet_id ?? null,
				user_id: user.id,
			})
			.select()
			.single(),
		supabase
			.from("tasks")
			.update({
				status: "completed",
				completed_at: now,
				updated_at: now,
			})
			.eq("id", taskId),
	]);

	if (insertResult.error) throw insertResult.error;

	// Background reindex
	reindexActiveTasks(currentTask.pamphlet_id).catch(console.error);

	return insertResult.data;
}

export async function reenterAndComplete(
	originalTaskId: string,
	newText: string,
	pageNumber: number,
	position: number,
	totalTimeMs: number,
	tag: TagId | null,
	pamphletId: string | null,
): Promise<Task> {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const now = new Date().toISOString();

	// Mark original complete and insert new in parallel
	const [insertResult] = await Promise.all([
		supabase
			.from("tasks")
			.insert({
				text: newText,
				page_number: 9999, // sentinel for reindex
				position: 9999,
				status: "active",
				total_time_ms: totalTimeMs,
				re_entered_from: originalTaskId,
				tag: tag ?? null,
				pamphlet_id: pamphletId ?? null,
				user_id: user.id,
			})
			.select()
			.single(),
		supabase
			.from("tasks")
			.update({
				status: "completed",
				completed_at: now,
				total_time_ms: totalTimeMs,
				updated_at: now,
			})
			.eq("id", originalTaskId),
	]);

	if (insertResult.error) throw insertResult.error;

	// Background reindex
	reindexActiveTasks(pamphletId).catch(console.error);

	return insertResult.data;
}

// =============================================================================
// TASK DELETION - OPTIMIZED
// =============================================================================

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

	// Background reindex
	reindexActiveTasks(pamphletId).catch(console.error);
}

// =============================================================================
// APP STATE
// =============================================================================

export async function getAppState(): Promise<AppState> {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const { data, error } = await supabase
		.from("app_state")
		.select("*")
		.eq("user_id", user.id)
		.single();

	if (error && error.code === "PGRST116") {
		const { data: newState, error: insertError } = await supabase
			.from("app_state")
			.insert({
				id: crypto.randomUUID(),
				user_id: user.id,
				current_page: 1,
				page_size: 12,
				last_pass_had_no_action: false,
				working_on_task_id: null,
				session_start_time: null,
				timer_state: "idle",
				current_session_ms: 0,
				default_filter: "all",
			})
			.select()
			.single();

		if (insertError) throw insertError;
		return newState;
	}

	if (error) throw error;
	return data;
}

export async function updateAppState(
	updates: Partial<AppState>,
): Promise<AppState> {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const { data, error } = await supabase
		.from("app_state")
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq("user_id", user.id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

// =============================================================================
// TIMER OPERATIONS - OPTIMIZED
// =============================================================================

export async function startWorkingOnTask(taskId: string): Promise<AppState> {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const now = new Date().toISOString();

	// Update app state and task status in parallel
	const [appStateResult] = await Promise.all([
		supabase
			.from("app_state")
			.update({
				working_on_task_id: taskId,
				session_start_time: now,
				timer_state: "running",
				current_session_ms: 0,
				updated_at: now,
			})
			.eq("user_id", user.id)
			.select()
			.single(),
		supabase
			.from("tasks")
			.update({ status: "in-progress", updated_at: now })
			.eq("id", taskId),
	]);

	if (appStateResult.error) throw appStateResult.error;
	return appStateResult.data;
}

export async function stopWorkingOnTask(): Promise<AppState> {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const { data, error } = await supabase
		.from("app_state")
		.update({
			working_on_task_id: null,
			session_start_time: null,
			timer_state: "idle",
			current_session_ms: 0,
			updated_at: new Date().toISOString(),
		})
		.eq("user_id", user.id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function pauseTimer(currentSessionMs: number): Promise<AppState> {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const { data, error } = await supabase
		.from("app_state")
		.update({
			timer_state: "paused",
			current_session_ms: currentSessionMs,
			updated_at: new Date().toISOString(),
		})
		.eq("user_id", user.id)
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
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const now = new Date().toISOString();

	// Get current task and update everything in parallel
	const [currentTaskResult, appStateResult] = await Promise.all([
		supabase.from("tasks").select("*").eq("id", taskId).single(),
		supabase
			.from("app_state")
			.update({
				timer_state: "stopped",
				current_session_ms: 0,
				session_start_time: null,
				updated_at: now,
			})
			.eq("user_id", user.id)
			.select()
			.single(),
	]);

	if (currentTaskResult.error) throw currentTaskResult.error;
	if (appStateResult.error) throw appStateResult.error;

	const newTotalTime =
		(currentTaskResult.data.total_time_ms || 0) + sessionTimeMs;

	// Update task time (fire and forget - not critical for UI)
	supabase
		.from("tasks")
		.update({
			total_time_ms: newTotalTime,
			updated_at: now,
		})
		.eq("id", taskId)
		.then(() => {}, console.error);

	return {
		appState: appStateResult.data,
		task: { ...currentTaskResult.data, total_time_ms: newTotalTime },
	};
}

export async function resumeTimer(): Promise<AppState> {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const { data, error } = await supabase
		.from("app_state")
		.update({
			timer_state: "running",
			session_start_time: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq("user_id", user.id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function startTask(taskId: string): Promise<AppState> {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const now = new Date().toISOString();

	// Update app state and task in parallel
	const [appStateResult] = await Promise.all([
		supabase
			.from("app_state")
			.update({
				working_on_task_id: taskId,
				session_start_time: null,
				timer_state: "idle",
				current_session_ms: 0,
				updated_at: now,
			})
			.eq("user_id", user.id)
			.select()
			.single(),
		supabase
			.from("tasks")
			.update({ status: "in-progress", updated_at: now })
			.eq("id", taskId),
	]);

	if (appStateResult.error) throw appStateResult.error;
	return appStateResult.data;
}

// =============================================================================
// TASK REORDERING & REINDEXING
// =============================================================================

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
	const now = new Date().toISOString();

	// Parallel updates
	await Promise.all(
		updates.map((update) =>
			supabase
				.from("tasks")
				.update({
					page_number: update.page_number,
					position: update.position,
					updated_at: now,
				})
				.eq("id", update.id),
		),
	);
}

export async function revertTaskLastPosition(taskId: string): Promise<Task> {
	const supabase = createClient();

	const activeTasks = await getActiveTasks();
	const PAGE_SIZE = 12;

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

	const now = new Date().toISOString();

	const { data, error } = await supabase
		.from("tasks")
		.update({
			status: "active",
			completed_at: null,
			page_number: pageNumber,
			position: position,
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

	// Fetch existing tasks
	let query = supabase
		.from("tasks")
		.select("id, page_number, position")
		.in("status", ["active", "in-progress"]);

	if (pamphletId) query = query.eq("pamphlet_id", pamphletId);

	const { data: existingTasks, error: fetchError } = await query
		.order("page_number", { ascending: true })
		.order("position", { ascending: true });

	if (fetchError) throw fetchError;

	// Parallel shift and revert
	const updates = (existingTasks || []).map((task, index) =>
		supabase
			.from("tasks")
			.update({
				page_number: Math.floor((index + 1) / PAGE_SIZE) + 1,
				position: (index + 1) % PAGE_SIZE,
				updated_at: now,
			})
			.eq("id", task.id),
	);

	const revertPromise = supabase
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

	const [revertResult] = await Promise.all([revertPromise, ...updates]);

	if (revertResult.error) throw revertResult.error;
	return revertResult.data;
}

export async function reindexActiveTasks(
	pamphletId?: string | null,
): Promise<void> {
	const supabase = createClient();
	const PAGE_SIZE = 12;
	const now = new Date().toISOString();

	let query = supabase
		.from("tasks")
		.select("id, page_number, position")
		.in("status", ["active", "in-progress"]);

	if (pamphletId) query = query.eq("pamphlet_id", pamphletId);

	const { data: tasks, error } = await query
		.order("page_number", { ascending: true })
		.order("position", { ascending: true });

	if (error) throw error;
	if (!tasks || tasks.length === 0) return;

	// Parallel updates
	await Promise.all(
		tasks.map((task, index) =>
			supabase
				.from("tasks")
				.update({
					page_number: Math.floor(index / PAGE_SIZE) + 1,
					position: index % PAGE_SIZE,
					updated_at: now,
				})
				.eq("id", task.id),
		),
	);
}

// =============================================================================
// TAG OPERATIONS
// =============================================================================

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

// =============================================================================
// CLEANUP & MISC
// =============================================================================

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
// PAMPHLET OPERATIONS
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
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const { data, error } = await supabase
		.from("pamphlets")
		.insert({ name, color, position, user_id: user.id })
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
	await Promise.all(
		updates.map((update) =>
			supabase
				.from("pamphlets")
				.update({
					position: update.position,
					updated_at: new Date().toISOString(),
				})
				.eq("id", update.id),
		),
	);
}

// =============================================================================
// LOGGED ACTIVITY
// =============================================================================

export async function addLoggedActivity(
	text: string,
	tag?: TagId | null,
	note?: string | null,
	completedAt?: string | null,
	pamphletId?: string | null,
	source?: "log" | "task",
): Promise<Task> {
	const supabase = createClient();
	const now = new Date().toISOString();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const { data, error } = await supabase
		.from("tasks")
		.insert({
			text,
			status: "completed",
			source: source ?? "log",
			completed_at: completedAt ?? now,
			total_time_ms: 0,
			page_number: 1,
			position: 0,
			tag: tag ?? null,
			note: note ?? null,
			pamphlet_id: pamphletId ?? null,
			user_id: user.id,
		})
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function createAndCompleteTask(
	text: string,
	pamphletId?: string | null,
	tag?: TagId | null,
): Promise<Task> {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const now = new Date().toISOString();

	const { data, error } = await supabase
		.from("tasks")
		.insert({
			text,
			status: "completed",
			source: "task",
			completed_at: now,
			total_time_ms: 0,
			page_number: 1,
			position: 0,
			tag: tag ?? null,
			note: null,
			pamphlet_id: pamphletId ?? null,
			user_id: user.id,
		})
		.select()
		.single();

	if (error) throw error;
	return data;
}

// =============================================================================
// TIME BLOCK OPERATIONS
// =============================================================================

import type { TimeBlock } from "@/lib/types";

export async function getTimeBlocksForDate(date: Date): Promise<TimeBlock[]> {
	const supabase = createClient();
	const start = startOfDay(date).toISOString();
	const end = endOfDay(date).toISOString();

	const { data, error } = await supabase
		.from("time_blocks")
		.select("*")
		.gte("start_time", start)
		.lte("start_time", end)
		.order("start_time", { ascending: true });

	if (error) throw error;
	return data || [];
}

export async function createTimeBlock(
	block: Omit<TimeBlock, "id" | "user_id" | "created_at" | "updated_at">,
): Promise<TimeBlock> {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const { data, error } = await supabase
		.from("time_blocks")
		.insert({ ...block, user_id: user.id })
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function updateTimeBlock(
	id: string,
	updates: Partial<TimeBlock>,
): Promise<TimeBlock> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("time_blocks")
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function deleteTimeBlock(id: string): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("time_blocks").delete().eq("id", id);

	if (error) throw error;
}

// =============================================================================
// TASK SCHEDULING
// =============================================================================

export async function scheduleTask(
	taskId: string,
	scheduledAt: string,
): Promise<Task> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("tasks")
		.update({ scheduled_at: scheduledAt, updated_at: new Date().toISOString() })
		.eq("id", taskId)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function unscheduleTask(taskId: string): Promise<Task> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("tasks")
		.update({ scheduled_at: null, updated_at: new Date().toISOString() })
		.eq("id", taskId)
		.select()
		.single();

	if (error) throw error;
	return data;
}
