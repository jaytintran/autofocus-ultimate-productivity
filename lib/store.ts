import { createClient } from "@/lib/supabase/client";
import type { Task, AppState, TaskStatus, Pamphlet } from "@/lib/types";
import { TagId } from "@/lib/tags";
import type { PamphletColor } from "@/lib/pamphlet-colors";
import { db } from "@/lib/db";
import { isOnline, queueWrite } from "@/lib/offline-guard";
const APP_STATE_ID = "00000000-0000-0000-0000-000000000001";

let cachedUserId: string | null = null;

async function getUserId(): Promise<string> {
	if (cachedUserId) return cachedUserId;
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");
	cachedUserId = user.id;
	return cachedUserId;
}

async function getActiveTasksFromIDB(pamphletId?: string | null) {
	const all = await db.tasks
		.where("status")
		.anyOf(["active", "in-progress"])
		.toArray();
	return all
		.filter((t) => (pamphletId ? t.pamphlet_id === pamphletId : true))
		.sort((a, b) => a.page_number - b.page_number || a.position - b.position);
}

/**
 * Retrieves all tasks from the database, ordered by page_number then position.
 * @returns {Promise<Task[]>} Array of all tasks
 */
export async function getTasks(): Promise<Task[]> {
	if (!isOnline()) {
		return db.tasks.orderBy("page_number").toArray();
	}
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
	if (!isOnline()) {
		return db.tasks.where("status").equals(status).toArray();
	}
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
	if (!isOnline()) {
		const tasks = await db.tasks
			.where("status")
			.anyOf(["active", "in-progress"])
			.toArray();
		return tasks.sort(
			(a, b) => a.page_number - b.page_number || a.position - b.position,
		);
	}
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
	if (!isOnline()) {
		const all = await db.tasks.where("status").equals("completed").toArray();
		const sorted = all.sort(
			(a, b) =>
				new Date(b.completed_at!).getTime() -
				new Date(a.completed_at!).getTime(),
		);
		return sorted.slice(
			(page - 1) * COMPLETED_PAGE_SIZE,
			page * COMPLETED_PAGE_SIZE,
		);
	}
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
	if (!isOnline()) {
		return db.tasks.where("status").equals("completed").count();
	}
	const supabase = createClient();
	const { count, error } = await supabase
		.from("tasks")
		.select("*", { count: "exact", head: true })
		.eq("status", "completed");
	if (error) throw error;
	return count || 0;
}

export async function getTasksForPage(pageNumber: number): Promise<Task[]> {
	if (!isOnline()) {
		const tasks = await db.tasks
			.where("page_number")
			.equals(pageNumber)
			.toArray();
		return tasks
			.filter((t) => t.status === "active" || t.status === "in-progress")
			.sort((a, b) => a.position - b.position);
	}
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
	const userId = await getUserId();
	const supabase = isOnline() ? createClient() : null;

	const PAGE_SIZE = 12;
	const now = new Date().toISOString();

	if (!isOnline()) {
		const existingTasks = await getActiveTasksFromIDB(pamphletId);

		const newTask: Task = {
			id: crypto.randomUUID(),
			text,
			status: "active",
			page_number: pageNumber,
			position,
			tag: tag ?? null,
			due_date: dueDate ?? null,
			pamphlet_id: pamphletId ?? null,
			user_id: userId,
			added_at: now,
			created_at: now,
			updated_at: now,
			completed_at: null,
			total_time_ms: 0,
			re_entered_from: null,
			note: null,
			source: "task",
		};

		// Shift existing tasks down
		const shiftedTasks = existingTasks.map((task, i) => ({
			...task,
			page_number: Math.floor((i + 1) / PAGE_SIZE) + 1,
			position: (i + 1) % PAGE_SIZE,
			updated_at: now,
		}));

		await db.tasks.bulkPut([newTask, ...shiftedTasks]);
		await queueWrite({
			table: "tasks",
			action: "insert",
			payload: newTask as unknown as Record<string, unknown>,
		});
		for (const t of shiftedTasks) {
			await queueWrite({
				table: "tasks",
				action: "update",
				payload: {
					id: t.id,
					page_number: t.page_number,
					position: t.position,
					updated_at: now,
				},
			});
		}
		return newTask;
	}

	const { data: existingTasks } = await supabase!
		.from("tasks")
		.select("*")
		.in("status", ["active", "in-progress"])
		.order("page_number", { ascending: true })
		.order("position", { ascending: true });

	const updatePromises = (existingTasks || []).map((task, i) =>
		supabase!
			.from("tasks")
			.update({
				page_number: Math.floor((i + 1) / PAGE_SIZE) + 1,
				position: (i + 1) % PAGE_SIZE,
				updated_at: now,
			})
			.eq("id", task.id),
	);

	const insertPromise = supabase!
		.from("tasks")
		.insert({
			text,
			page_number: pageNumber,
			position,
			status: "active",
			tag: tag ?? null,
			due_date: dueDate ?? null,
			pamphlet_id: pamphletId ?? null,
			user_id: userId,
		})
		.select()
		.single();

	const [insertResult] = await Promise.all([insertPromise, ...updatePromises]);
	if (insertResult.error) throw insertResult.error;
	await db.tasks.put(insertResult.data);
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
	const userId = await getUserId();
	const supabase = isOnline() ? createClient() : null;

	const PAGE_SIZE = 12;
	const now = new Date().toISOString();

	if (!isOnline()) {
		const pamphletId = tasks[0]?.pamphletId ?? null;
		const existingTasks = await getActiveTasksFromIDB(pamphletId);

		const newTasks: Task[] = tasks.map((t, i) => ({
			id: crypto.randomUUID(),
			text: t.text,
			status: "active" as TaskStatus,
			page_number: Math.floor(i / PAGE_SIZE) + 1,
			position: i % PAGE_SIZE,
			tag: t.tag ?? null,
			due_date: t.dueDate ?? null,
			pamphlet_id: t.pamphletId ?? null,
			user_id: userId,
			added_at: now,
			created_at: now,
			updated_at: now,
			completed_at: null,
			total_time_ms: 0,
			re_entered_from: null,
			note: null,
			source: "task",
		}));

		const shiftedTasks = existingTasks.map((task, i) => ({
			...task,
			page_number: Math.floor((i + tasks.length) / PAGE_SIZE) + 1,
			position: (i + tasks.length) % PAGE_SIZE,
			updated_at: now,
		}));

		await db.tasks.bulkPut([...newTasks, ...shiftedTasks]);
		for (const t of newTasks) {
			await queueWrite({
				table: "tasks",
				action: "insert",
				payload: t as unknown as Record<string, unknown>,
			});
		}
		for (const t of shiftedTasks) {
			await queueWrite({
				table: "tasks",
				action: "update",
				payload: {
					id: t.id,
					page_number: t.page_number,
					position: t.position,
					updated_at: now,
				},
			});
		}
		return newTasks;
	}

	const { data: existingTasks } = await supabase!
		.from("tasks")
		.select("*")
		.in("status", ["active", "in-progress"])
		.order("page_number", { ascending: true })
		.order("position", { ascending: true });

	const shiftAmount = tasks.length;
	const updatePromises = (existingTasks || []).map((task, i) =>
		supabase!
			.from("tasks")
			.update({
				page_number: Math.floor((i + shiftAmount) / PAGE_SIZE) + 1,
				position: (i + shiftAmount) % PAGE_SIZE,
				updated_at: now,
			})
			.eq("id", task.id),
	);

	const insertPromise = supabase!
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
				user_id: userId,
			})),
		)
		.select();

	const [insertResult] = await Promise.all([insertPromise, ...updatePromises]);
	if (insertResult.error) throw insertResult.error;
	await db.tasks.bulkPut(insertResult.data || []);
	return insertResult.data || [];
}

export async function updateTask(
	id: string,
	updates: Partial<Task>,
): Promise<Task> {
	const now = new Date().toISOString();
	const updatedTask = { ...updates, updated_at: now };

	if (!isOnline()) {
		await db.tasks.update(id, updatedTask);
		await queueWrite({
			table: "tasks",
			action: "update",
			payload: { id, ...updatedTask },
		});
		const task = await db.tasks.get(id);
		return task!;
	}
	const supabase = createClient();
	const { data, error } = await supabase
		.from("tasks")
		.update(updatedTask)
		.eq("id", id)
		.select()
		.single();
	if (error) throw error;
	await db.tasks.update(id, data);
	return data;
}
export async function completeTask(
	id: string,
	totalTimeMs: number,
	pamphletId?: string | null,
): Promise<Task> {
	const now = new Date().toISOString();
	const PAGE_SIZE = 12;

	if (!isOnline()) {
		const task = await db.tasks.get(id);
		if (!task) throw new Error("Task not found");

		const completedTask: Task = {
			...task,
			status: "completed",
			completed_at: now,
			total_time_ms: totalTimeMs,
			updated_at: now,
		};
		await db.tasks.put(completedTask);
		await queueWrite({
			table: "tasks",
			action: "update",
			payload: {
				id,
				status: "completed",
				completed_at: now,
				total_time_ms: totalTimeMs,
				updated_at: now,
			},
		});

		const remaining = await getActiveTasksFromIDB(pamphletId);

		const reindexed = remaining.map((t, i) => ({
			...t,
			page_number: Math.floor(i / PAGE_SIZE) + 1,
			position: i % PAGE_SIZE,
			updated_at: now,
		}));

		await db.tasks.bulkPut(reindexed);
		for (const t of reindexed) {
			await queueWrite({
				table: "tasks",
				action: "update",
				payload: {
					id: t.id,
					page_number: t.page_number,
					position: t.position,
					updated_at: now,
				},
			});
		}
		return completedTask;
	}

	const supabase = createClient();
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
	await db.tasks.put(data);

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

	for (const [index, task] of remainingTasks.entries()) {
		const updates = {
			page_number: Math.floor(index / PAGE_SIZE) + 1,
			position: index % PAGE_SIZE,
			updated_at: now,
		};
		await supabase.from("tasks").update(updates).eq("id", task.id);
		await db.tasks.update(task.id, updates);
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
	const userId = await getUserId();
	const supabase = isOnline() ? createClient() : null;

	const now = new Date().toISOString();

	if (!isOnline()) {
		const newTask: Task = {
			id: crypto.randomUUID(),
			text: newText,
			status: "active",
			page_number: pageNumber,
			position,
			total_time_ms: totalTimeMs || 0,
			re_entered_from: originalTaskId,
			tag: tag ?? null,
			pamphlet_id: pamphletId ?? null,
			user_id: userId,
			added_at: now,
			created_at: now,
			updated_at: now,
			completed_at: null,
			note: null,
			due_date: null,
			source: "task",
		};
		await db.tasks.put(newTask);
		await queueWrite({
			table: "tasks",
			action: "insert",
			payload: newTask as unknown as Record<string, unknown>,
		});
		return newTask;
	}

	const { data, error } = await supabase!
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
			user_id: userId,
		})
		.select()
		.single();
	if (error) throw error;
	await db.tasks.put(data);
	return data;
}

export async function deleteTask(
	id: string,
	pamphletId?: string | null,
): Promise<void> {
	const now = new Date().toISOString();
	const PAGE_SIZE = 12;

	if (!isOnline()) {
		const task = await db.tasks.get(id);
		if (!task) return;
		await db.tasks.delete(id);
		await queueWrite({ table: "tasks", action: "delete", payload: { id } });

		if (task.status === "completed") return;

		const remaining = (await getActiveTasksFromIDB(pamphletId)).filter(
			(t) => t.id !== id,
		);

		const reindexed = remaining.map((t, i) => ({
			...t,
			page_number: Math.floor(i / PAGE_SIZE) + 1,
			position: i % PAGE_SIZE,
			updated_at: now,
		}));

		await db.tasks.bulkPut(reindexed);
		for (const t of reindexed) {
			await queueWrite({
				table: "tasks",
				action: "update",
				payload: {
					id: t.id,
					page_number: t.page_number,
					position: t.position,
					updated_at: now,
				},
			});
		}
		return;
	}

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
	await db.tasks.delete(id);

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

	for (const [index, task] of remainingTasks.entries()) {
		const updates = {
			page_number: Math.floor(index / PAGE_SIZE) + 1,
			position: index % PAGE_SIZE,
			updated_at: now,
		};
		await supabase.from("tasks").update(updates).eq("id", task.id);
		await db.tasks.update(task.id, updates);
	}
}

// App State functions
export async function getAppState(): Promise<AppState> {
	// app_state is never cached — always requires network
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

export async function startWorkingOnTask(taskId: string): Promise<AppState> {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const { data, error } = await supabase
		.from("app_state")
		.update({
			working_on_task_id: taskId,
			session_start_time: new Date().toISOString(),
			timer_state: "running",
			current_session_ms: 0,
			updated_at: new Date().toISOString(),
		})
		.eq("user_id", user.id)
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
	// app_state — online only, no queue
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
	// app_state — online only, no queue
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
		.eq("user_id", user.id)
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
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

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
			user_id: user.id,
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
	// app_state — online only, no queue
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

export async function getTotalPageCount(): Promise<number> {
	if (!isOnline()) {
		const tasks = await db.tasks
			.where("status")
			.anyOf(["active", "in-progress"])
			.toArray();
		if (tasks.length === 0) return 1;
		return Math.max(...tasks.map((t) => t.page_number));
	}
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
	const now = new Date().toISOString();

	if (!isOnline()) {
		for (const update of updates) {
			await db.tasks.update(update.id, {
				page_number: update.page_number,
				position: update.position,
				updated_at: now,
			});
			await queueWrite({
				table: "tasks",
				action: "update",
				payload: {
					id: update.id,
					page_number: update.page_number,
					position: update.position,
					updated_at: now,
				},
			});
		}
		return;
	}

	const supabase = createClient();
	for (const update of updates) {
		const { error } = await supabase
			.from("tasks")
			.update({
				page_number: update.page_number,
				position: update.position,
				updated_at: now,
			})
			.eq("id", update.id);
		if (error) throw error;
		await db.tasks.update(update.id, {
			page_number: update.page_number,
			position: update.position,
			updated_at: now,
		});
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

export async function revertTask(
	taskId: string,
	pamphletId?: string | null,
): Promise<Task> {
	const now = new Date().toISOString();
	const PAGE_SIZE = 12;

	if (!isOnline()) {
		const existingTasks = await getActiveTasksFromIDB(pamphletId);

		// Shift existing down to make room at position 0
		const shiftedTasks = existingTasks.map((t, i) => ({
			...t,
			page_number: Math.floor((i + 1) / PAGE_SIZE) + 1,
			position: (i + 1) % PAGE_SIZE,
			updated_at: now,
		}));

		const task = await db.tasks.get(taskId);
		if (!task) throw new Error("Task not found");

		const revertedTask: Task = {
			...task,
			status: "active",
			completed_at: null,
			page_number: 1,
			position: 0,
			updated_at: now,
		};

		await db.tasks.bulkPut([revertedTask, ...shiftedTasks]);
		await queueWrite({
			table: "tasks",
			action: "update",
			payload: {
				id: taskId,
				status: "active",
				completed_at: null,
				page_number: 1,
				position: 0,
				updated_at: now,
			},
		});
		for (const t of shiftedTasks) {
			await queueWrite({
				table: "tasks",
				action: "update",
				payload: {
					id: t.id,
					page_number: t.page_number,
					position: t.position,
					updated_at: now,
				},
			});
		}
		return revertedTask;
	}

	const supabase = createClient();
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
		const updates = {
			page_number: Math.floor((index + 1) / PAGE_SIZE) + 1,
			position: (index + 1) % PAGE_SIZE,
			updated_at: now,
		};
		await supabase.from("tasks").update(updates).eq("id", task.id);
		await db.tasks.update(task.id, updates);
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
	await db.tasks.put(data);
	return data;
}

export async function markTaskDone(
	taskId: string,
	totalTimeMs: number = 0,
	pamphletId?: string | null,
): Promise<Task> {
	const now = new Date().toISOString();
	const PAGE_SIZE = 12;

	if (!isOnline()) {
		const task = await db.tasks.get(taskId);
		if (!task) throw new Error("Task not found");

		const completedTask: Task = {
			...task,
			status: "completed",
			completed_at: now,
			total_time_ms: totalTimeMs,
			updated_at: now,
		};
		await db.tasks.put(completedTask);
		await queueWrite({
			table: "tasks",
			action: "update",
			payload: {
				id: taskId,
				status: "completed",
				completed_at: now,
				total_time_ms: totalTimeMs,
				updated_at: now,
			},
		});

		// Reindex remaining active tasks in IDB
		const remaining = (await getActiveTasksFromIDB(pamphletId)).filter(
			(t) => t.id !== taskId,
		);

		const reindexed = remaining.map((t, i) => ({
			...t,
			page_number: Math.floor(i / PAGE_SIZE) + 1,
			position: i % PAGE_SIZE,
			updated_at: now,
		}));

		await db.tasks.bulkPut(reindexed);
		for (const t of reindexed) {
			await queueWrite({
				table: "tasks",
				action: "update",
				payload: {
					id: t.id,
					page_number: t.page_number,
					position: t.position,
					updated_at: now,
				},
			});
		}
		return completedTask;
	}

	const supabase = createClient();
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
	await db.tasks.put(data);

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

	for (const [index, task] of remainingTasks.entries()) {
		const updates = {
			page_number: Math.floor(index / PAGE_SIZE) + 1,
			position: index % PAGE_SIZE,
			updated_at: now,
		};
		await supabase.from("tasks").update(updates).eq("id", task.id);
		await db.tasks.update(task.id, updates);
	}
	return data;
}

export async function startTask(taskId: string): Promise<AppState> {
	// app_state — online only, no queue
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");
	const { data, error } = await supabase
		.from("app_state")
		.update({
			working_on_task_id: taskId,
			session_start_time: null,
			timer_state: "idle",
			current_session_ms: 0,
			updated_at: new Date().toISOString(),
		})
		.eq("user_id", user.id)
		.select()
		.single();
	if (error) throw error;
	await supabase
		.from("tasks")
		.update({ status: "in-progress", updated_at: new Date().toISOString() })
		.eq("id", taskId);
	await db.tasks.update(taskId, {
		status: "in-progress",
		updated_at: new Date().toISOString(),
	});
	return data;
}
export async function updateTaskTag(
	taskId: string,
	tag: TagId | null,
): Promise<void> {
	const now = new Date().toISOString();

	if (!isOnline()) {
		await db.tasks.update(taskId, { tag, updated_at: now });
		await queueWrite({
			table: "tasks",
			action: "update",
			payload: { id: taskId, tag, updated_at: now },
		});
		return;
	}
	const supabase = createClient();
	const { error } = await supabase
		.from("tasks")
		.update({ tag, updated_at: now })
		.eq("id", taskId);
	if (error) throw error;
	await db.tasks.update(taskId, { tag, updated_at: now });
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
	if (!isOnline()) {
		const tasks = await db.tasks.where("status").equals("completed").toArray();
		return tasks
			.filter((t) => t.note && t.note !== "")
			.sort(
				(a, b) =>
					new Date(b.completed_at!).getTime() -
					new Date(a.completed_at!).getTime(),
			);
	}
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
	if (!isOnline()) {
		return db.pamphlets.orderBy("position").toArray();
	}
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
	const userId = await getUserId();
	const supabase = isOnline() ? createClient() : null;

	if (!isOnline()) {
		const newPamphlet: Pamphlet = {
			id: crypto.randomUUID(),
			name,
			color,
			position,
			user_id: userId,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
		await db.pamphlets.put(newPamphlet);
		await queueWrite({
			table: "pamphlets",
			action: "insert",
			payload: newPamphlet as unknown as Record<string, unknown>,
		});
		return newPamphlet;
	}

	const { data, error } = await supabase!
		.from("pamphlets")
		.insert({ name, color, position, user_id: userId })
		.select()
		.single();
	if (error) throw error;
	await db.pamphlets.put(data);
	return data;
}

export async function updatePamphlet(
	id: string,
	updates: Partial<Pick<Pamphlet, "name" | "color" | "position">>,
): Promise<Pamphlet> {
	const now = new Date().toISOString();
	const updatedFields = { ...updates, updated_at: now };

	if (!isOnline()) {
		await db.pamphlets.update(id, updatedFields);
		await queueWrite({
			table: "pamphlets",
			action: "update",
			payload: { id, ...updatedFields },
		});
		const pamphlet = await db.pamphlets.get(id);
		return pamphlet!;
	}

	const supabase = createClient();
	const { data, error } = await supabase
		.from("pamphlets")
		.update(updatedFields)
		.eq("id", id)
		.select()
		.single();
	if (error) throw error;
	await db.pamphlets.put(data);
	return data;
}

export async function deletePamphlet(id: string): Promise<void> {
	if (!isOnline()) {
		await db.pamphlets.delete(id);
		await queueWrite({ table: "pamphlets", action: "delete", payload: { id } });
		return;
	}

	const supabase = createClient();
	const { error } = await supabase.from("pamphlets").delete().eq("id", id);
	if (error) throw error;
	await db.pamphlets.delete(id);
}

export async function reassignPamphletTasks(
	fromPamphletId: string,
	toPamphletId: string,
): Promise<void> {
	const now = new Date().toISOString();

	if (!isOnline()) {
		const tasks = await db.tasks
			.where("pamphlet_id")
			.equals(fromPamphletId)
			.toArray();
		for (const task of tasks) {
			await db.tasks.update(task.id, {
				pamphlet_id: toPamphletId,
				updated_at: now,
			});
			await queueWrite({
				table: "tasks",
				action: "update",
				payload: { id: task.id, pamphlet_id: toPamphletId, updated_at: now },
			});
		}
		return;
	}

	const supabase = createClient();
	const { error } = await supabase
		.from("tasks")
		.update({ pamphlet_id: toPamphletId, updated_at: now })
		.eq("pamphlet_id", fromPamphletId);
	if (error) throw error;
}

export async function getActiveTasksForPamphlet(
	pamphletId: string,
): Promise<Task[]> {
	if (!isOnline()) {
		const tasks = await db.tasks
			.where("pamphlet_id")
			.equals(pamphletId)
			.toArray();
		return tasks
			.filter((t) => t.status === "active" || t.status === "in-progress")
			.sort((a, b) => a.page_number - b.page_number || a.position - b.position);
	}
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
	if (!isOnline()) {
		const all = await db.tasks
			.where("pamphlet_id")
			.equals(pamphletId)
			.toArray();
		const sorted = all
			.filter((t) => t.status === "completed")
			.sort(
				(a, b) =>
					new Date(b.completed_at!).getTime() -
					new Date(a.completed_at!).getTime(),
			);
		return sorted.slice((page - 1) * 50, page * 50);
	}
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
	if (!isOnline()) {
		const tasks = await db.tasks
			.where("pamphlet_id")
			.equals(pamphletId)
			.toArray();
		const active = tasks.filter(
			(t) => t.status === "active" || t.status === "in-progress",
		);
		if (active.length === 0) return 1;
		return Math.max(...active.map((t) => t.page_number));
	}
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
	const now = new Date().toISOString();

	if (!isOnline()) {
		await db.tasks.update(taskId, {
			pamphlet_id: toPamphletId,
			updated_at: now,
		});
		await queueWrite({
			table: "tasks",
			action: "update",
			payload: { id: taskId, pamphlet_id: toPamphletId, updated_at: now },
		});
		return;
	}
	const supabase = createClient();
	const { error } = await supabase
		.from("tasks")
		.update({ pamphlet_id: toPamphletId, updated_at: now })
		.eq("id", taskId);
	if (error) throw error;
	await db.tasks.update(taskId, { pamphlet_id: toPamphletId, updated_at: now });
}

export async function reorderPamphlets(
	updates: Array<{ id: string; position: number }>,
): Promise<void> {
	const now = new Date().toISOString();

	if (!isOnline()) {
		for (const update of updates) {
			await db.pamphlets.update(update.id, {
				position: update.position,
				updated_at: now,
			});
			await queueWrite({
				table: "pamphlets",
				action: "update",
				payload: { id: update.id, position: update.position, updated_at: now },
			});
		}
		return;
	}

	const supabase = createClient();
	for (const update of updates) {
		const { error } = await supabase
			.from("pamphlets")
			.update({ position: update.position, updated_at: now })
			.eq("id", update.id);
		if (error) throw error;
		await db.pamphlets.update(update.id, {
			position: update.position,
			updated_at: now,
		});
	}
}

// =============================================================================
// LOGGED ACTIVITY FUNCTIONS
// =============================================================================

export async function addLoggedActivity(
	text: string,
	tag?: TagId | null,
	note?: string | null,
	completedAt?: string | null,
	pamphletId?: string | null,
	source?: "log" | "task",
): Promise<Task> {
	const now = new Date().toISOString();
	const userId = await getUserId();
	const supabase = isOnline() ? createClient() : null;

	const newTask: Task = {
		id: crypto.randomUUID(),
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
		user_id: userId,
		added_at: now,
		created_at: now,
		updated_at: now,
		re_entered_from: null,
		due_date: null,
	};

	if (!isOnline()) {
		await db.tasks.put(newTask);
		await queueWrite({ table: "tasks", action: "insert", payload: newTask });
		return newTask;
	}

	const { data, error } = await supabase!
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
			user_id: userId,
		})
		.select()
		.single();
	if (error) throw error;
	await db.tasks.put(data);
	return data;
}
export async function createAndCompleteTask(
	text: string,
	pamphletId?: string | null,
	tag?: TagId | null,
): Promise<Task> {
	const now = new Date().toISOString();
	const userId = await getUserId();
	const supabase = isOnline() ? createClient() : null;

	const newTask: Task = {
		id: crypto.randomUUID(),
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
		user_id: userId,
		added_at: now,
		created_at: now,
		updated_at: now,
		re_entered_from: null,
		due_date: null,
	};

	if (!isOnline()) {
		await db.tasks.put(newTask);
		await queueWrite({ table: "tasks", action: "insert", payload: newTask });
		return newTask;
	}

	const { data, error } = await supabase!
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
			user_id: userId,
		})
		.select()
		.single();
	if (error) throw error;
	await db.tasks.put(data);
	return data;
}
