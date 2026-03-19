import { createClient } from "@/lib/supabase/client";
import type { Task, AppState, TaskStatus } from "@/lib/types";

const APP_STATE_ID = "00000000-0000-0000-0000-000000000001";

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

export async function getCompletedTasks(): Promise<Task[]> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("tasks")
		.select("*")
		.eq("status", "completed")
		.order("completed_at", { ascending: false });

	if (error) throw error;
	return data || [];
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
): Promise<Task> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("tasks")
		.insert({
			text,
			page_number: pageNumber,
			position,
			status: "active",
			tag: tag ?? null,
		})
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function addMultipleTasks(
	tasks: Array<{
		text: string;
		pageNumber: number;
		position: number;
		tag?: TagId | null;
	}>,
): Promise<Task[]> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("tasks")
		.insert(
			tasks.map((t) => ({
				text: t.text,
				page_number: t.pageNumber,
				position: t.position,
				status: "active" as TaskStatus,
				tag: t.tag ?? null,
			})),
		)
		.select();

	if (error) throw error;
	return data || [];
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
	return data;
}

// dismissTask function removed

export async function reenterTask(
	originalTaskId: string,
	newText: string,
	pageNumber: number,
	position: number,
	totalTimeMs?: number,
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
		})
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function deleteTask(id: string): Promise<void> {
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

	const { data: tasksToReorder, error: reorderFetchError } = await supabase
		.from("tasks")
		.select("*")
		.in("status", ["active", "in-progress"])
		.gte("page_number", deletedTask.page_number)
		.order("page_number", { ascending: true })
		.order("position", { ascending: true });

	if (reorderFetchError) throw reorderFetchError;
	if (!tasksToReorder || tasksToReorder.length === 0) return;

	const PAGE_SIZE = 12;
	const updates = tasksToReorder.map((task, index) => {
		const newPageNumber =
			Math.floor(index / PAGE_SIZE) + deletedTask.page_number;
		const newPosition = index % PAGE_SIZE;
		return {
			id: task.id,
			page_number: newPageNumber,
			position: newPosition,
		};
	});

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

export async function revertTask(taskId: string): Promise<Task> {
	const supabase = createClient();

	// Get the max position on the last page
	const activeTasks = await getActiveTasks();
	const maxPage =
		activeTasks.length > 0
			? Math.max(...activeTasks.map((t) => t.page_number))
			: 1;
	const nextPosition = await getNextPosition(maxPage);

	const { data, error } = await supabase
		.from("tasks")
		.update({
			status: "active",
			completed_at: null,
			total_time_ms: 0,
			page_number: maxPage,
			position: nextPosition,
			updated_at: new Date().toISOString(),
		})
		.eq("id", taskId)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function markTaskDone(
	taskId: string,
	totalTimeMs: number = 0,
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
	tag: "read" | "learn" | "finish" | null,
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
