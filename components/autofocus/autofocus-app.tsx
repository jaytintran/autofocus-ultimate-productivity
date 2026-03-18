"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import useSWR from "swr";
import { Header } from "./header";
import { TimerBar } from "./timer-bar";
import { ViewTabs } from "./view-tabs";
import { PageNav } from "./page-nav";
import { TaskList } from "./task-list";
import { CompletedList } from "./completed-list";
import { TaskInput } from "./task-input";
import { BacklogDump } from "./backlog-dump";
import { AboutSection } from "./about-section";
import {
	addMultipleTasks,
	addTask,
	completeTask,
	deleteTask,
	getActiveTasks,
	getAppState,
	getCompletedTasks,
	getTasksForPage,
	getTotalPageCount,
	markTaskDone,
	pauseTimer,
	reenterTask,
	reorderTasks,
	resumeTimer,
	startTask,
	stopTimer,
	stopWorkingOnTask,
	updateTask,
} from "@/lib/store";
import type { Task, AppState } from "@/lib/types";

const DEFAULT_TASK_CAPACITY = 12;
const FALLBACK_TASK_ROW_HEIGHT = 48;

interface OptimisticStateSnapshot {
	activeTasks: Task[];
	completedTasks: Task[];
	appState: AppState;
	totalPages: number;
}

interface PagedTaskLike {
	page_number: number;
	position: number;
}

interface TaskPlacement {
	pageNumber: number;
	position: number;
}

interface TaskReorderUpdate {
	id: string;
	page_number: number;
	position: number;
}

function getVisibleTotalPages(tasks: Task[]): number {
	return tasks.length > 0
		? Math.max(...tasks.map((task) => task.page_number))
		: 1;
}

function getApproximateTaskCapacity(): number {
	return 12;
}

function getNextTaskPlacement(
	tasks: PagedTaskLike[],
	pageCapacity: number,
): TaskPlacement {
	const lastPageNumber =
		tasks.length > 0 ? Math.max(...tasks.map((task) => task.page_number)) : 1;
	const lastPageTasks = tasks.filter(
		(task) => task.page_number === lastPageNumber,
	);
	const normalizedCapacity = Math.max(1, pageCapacity);

	if (lastPageTasks.length >= normalizedCapacity) {
		return {
			pageNumber: lastPageNumber + 1,
			position: 0,
		};
	}

	return {
		pageNumber: lastPageNumber,
		position:
			lastPageTasks.length > 0
				? Math.max(...lastPageTasks.map((task) => task.position)) + 1
				: 0,
	};
}

function appendProjectedTask(
	tasks: PagedTaskLike[],
	pageCapacity: number,
): TaskPlacement {
	const placement = getNextTaskPlacement(tasks, pageCapacity);
	tasks.push({
		page_number: placement.pageNumber,
		position: placement.position,
	});
	return placement;
}

function getCurrentSessionMs(appState: AppState, nowMs: number): number {
	const baseSessionMs = appState.current_session_ms || 0;

	if (appState.timer_state !== "running" || !appState.session_start_time) {
		return baseSessionMs;
	}

	const sessionStartMs = new Date(appState.session_start_time).getTime();
	return baseSessionMs + Math.max(nowMs - sessionStartMs, 0);
}

function buildReorderedActiveTasks(
	tasks: Task[],
	draggedTaskId: string,
	targetTaskId: string,
): { activeTasks: Task[]; updates: TaskReorderUpdate[] } | null {
	const draggedTask = tasks.find((task) => task.id === draggedTaskId);
	const targetTask = tasks.find((task) => task.id === targetTaskId);

	if (!draggedTask || !targetTask || draggedTask.id === targetTask.id) {
		return null;
	}

	const reorderedPageTasks = tasks
		.filter(
			(task) =>
				task.page_number === targetTask.page_number &&
				task.id !== draggedTask.id,
		)
		.sort((a, b) => a.position - b.position);

	const insertIndex = reorderedPageTasks.findIndex(
		(task) => task.id === targetTask.id,
	);

	if (insertIndex === -1) {
		return null;
	}

	reorderedPageTasks.splice(insertIndex, 0, {
		...draggedTask,
		page_number: targetTask.page_number,
	});

	const now = new Date().toISOString();
	const updates = reorderedPageTasks.map((task, index) => ({
		id: task.id,
		page_number: targetTask.page_number,
		position: index,
	}));
	const updatesByTaskId = new Map(updates.map((update) => [update.id, update]));

	return {
		activeTasks: tasks
			.map((task) => {
				const update = updatesByTaskId.get(task.id);
				return update
					? {
							...task,
							page_number: update.page_number,
							position: update.position,
							updated_at: now,
						}
					: task;
			})
			.sort((a, b) => a.page_number - b.page_number || a.position - b.position),
		updates,
	};
}

export function AutofocusApp() {
	const [activeView, setActiveView] = useState<"tasks" | "completed">("tasks");
	const [currentPage, setCurrentPage] = useState(1);
	const [optimisticState, setOptimisticState] =
		useState<OptimisticStateSnapshot | null>(null);
	const [visibleTaskCapacity, setVisibleTaskCapacity] = useState(12);
	const [prefetchedTasks, setPrefetchedTasks] = useState<Map<number, Task[]>>(
		new Map(),
	);

	// Fetch active tasks
	const { data: activeTasks = [], mutate: mutateActive } = useSWR<Task[]>(
		"active-tasks",
		getActiveTasks,
		{ refreshInterval: 0 },
	);

	// Fetch completed tasks
	const { data: completedTasks = [], mutate: mutateCompleted } = useSWR<Task[]>(
		"completed-tasks",
		getCompletedTasks,
		{ refreshInterval: 0 },
	);

	// Fetch app state
	const { data: appState, mutate: mutateAppState } = useSWR<AppState>(
		"app-state",
		getAppState,
		{ refreshInterval: 1000 }, // Poll for timer updates
	);

	// Calculate total pages
	const { data: totalPages = 1, mutate: mutateTotalPages } = useSWR<number>(
		"total-pages",
		getTotalPageCount,
		{ refreshInterval: 0 },
	);

	const displayedActiveTasks = optimisticState?.activeTasks ?? activeTasks;
	const displayedCompletedTasks =
		optimisticState?.completedTasks ?? completedTasks;
	const displayedAppState = optimisticState?.appState ?? appState;
	const displayedTotalPages = optimisticState?.totalPages ?? totalPages;

	// Pre-fetch adjacent pages (current + next 2 pages)
	useEffect(() => {
		const prefetchPages = async () => {
			const pagesToPrefetch = [
				currentPage,
				currentPage + 1,
				currentPage + 2,
			].filter((page) => page <= displayedTotalPages);

			const newPrefetchedTasks = new Map(prefetchedTasks);

			for (const pageNum of pagesToPrefetch) {
				if (!newPrefetchedTasks.has(pageNum)) {
					try {
						const tasks = await getTasksForPage(pageNum);
						newPrefetchedTasks.set(pageNum, tasks);
					} catch (error) {
						console.error(`Failed to prefetch page ${pageNum}:`, error);
					}
				}
			}

			setPrefetchedTasks(newPrefetchedTasks);
		};

		prefetchPages();
	}, [currentPage, displayedTotalPages]);

	// Get tasks for current page with prefetch fallback
	const tasksForCurrentPage = useMemo(() => {
		// First try prefetched data
		const prefetched = prefetchedTasks.get(currentPage);
		if (prefetched && prefetched.length > 0) {
			return prefetched.sort((a, b) => a.position - b.position);
		}

		// Fallback to main data
		return displayedActiveTasks
			.filter((task) => task.page_number === currentPage)
			.sort((a, b) => a.position - b.position);
	}, [currentPage, displayedActiveTasks, prefetchedTasks]);

	// Get the working task
	const workingTask = displayedAppState?.working_on_task_id
		? displayedActiveTasks.find(
				(t) => t.id === displayedAppState.working_on_task_id,
			) || null
		: null;

	// Refresh all data
	const refreshAll = useCallback(async () => {
		await Promise.all([
			mutateActive(),
			mutateCompleted(),
			mutateAppState(),
			mutateTotalPages(),
		]);
	}, [mutateActive, mutateCompleted, mutateAppState, mutateTotalPages]);

	const runOptimisticUpdate = useCallback(
		async (nextState: OptimisticStateSnapshot, action: () => Promise<void>) => {
			setOptimisticState(nextState);

			try {
				await action();
				await refreshAll();
			} catch (error) {
				console.error("Optimistic update failed:", error);
				await refreshAll();
				throw error;
			} finally {
				setOptimisticState(null);
			}
		},
		[refreshAll],
	);

	const handleVisibleTaskCapacityChange = useCallback((capacity: number) => {
		setVisibleTaskCapacity((currentCapacity) =>
			currentCapacity === capacity ? currentCapacity : capacity,
		);
	}, []);

	const handleAddTask = useCallback(
		async (text: string) => {
			const trimmedText = text.trim();
			if (!trimmedText) return;

			const placement = getNextTaskPlacement(
				displayedActiveTasks,
				DEFAULT_TASK_CAPACITY,
			);

			await addTask(trimmedText, placement.pageNumber, placement.position);
			await refreshAll();
		},
		[displayedActiveTasks, refreshAll],
	);

	const handleAddTasks = useCallback(
		async (taskTexts: string[]) => {
			const trimmedTaskTexts = taskTexts
				.map((taskText) => taskText.trim())
				.filter((taskText) => taskText.length > 0);

			if (trimmedTaskTexts.length === 0) return;

			const projectedTasks = displayedActiveTasks.map((task) => ({
				page_number: task.page_number,
				position: task.position,
			}));

			const tasksToAdd = trimmedTaskTexts.map((taskText) => {
				const placement = appendProjectedTask(
					projectedTasks,
					DEFAULT_TASK_CAPACITY,
				);

				return {
					text: taskText,
					pageNumber: placement.pageNumber,
					position: placement.position,
				};
			});

			await addMultipleTasks(tasksToAdd);
			await refreshAll();
		},
		[displayedActiveTasks, refreshAll],
	);

	const handleStartTask = useCallback(
		async (task: Task) => {
			if (!displayedAppState) return;

			const now = new Date().toISOString();
			const optimisticActiveTasks = displayedActiveTasks.map((activeTask) =>
				activeTask.id === task.id
					? { ...activeTask, status: "in-progress", updated_at: now }
					: activeTask,
			);

			await runOptimisticUpdate(
				{
					activeTasks: optimisticActiveTasks,
					completedTasks: displayedCompletedTasks,
					appState: {
						...displayedAppState,
						working_on_task_id: task.id,
						session_start_time: null,
						timer_state: "idle",
						current_session_ms: 0,
						updated_at: now,
					},
					totalPages: getVisibleTotalPages(optimisticActiveTasks),
				},
				async () => {
					await startTask(task.id);
				},
			);
		},
		[
			displayedActiveTasks,
			displayedAppState,
			displayedCompletedTasks,
			runOptimisticUpdate,
		],
	);

	const handleReorderTasks = useCallback(
		async (draggedTaskId: string, targetTaskId: string) => {
			if (!displayedAppState) return;

			const reorderedState = buildReorderedActiveTasks(
				displayedActiveTasks,
				draggedTaskId,
				targetTaskId,
			);

			if (!reorderedState) return;

			await runOptimisticUpdate(
				{
					activeTasks: reorderedState.activeTasks,
					completedTasks: displayedCompletedTasks,
					appState: displayedAppState,
					totalPages: getVisibleTotalPages(reorderedState.activeTasks),
				},
				async () => {
					await reorderTasks(reorderedState.updates);
				},
			);
		},
		[
			displayedActiveTasks,
			displayedAppState,
			displayedCompletedTasks,
			runOptimisticUpdate,
		],
	);

	const handleDoneTask = useCallback(
		async (task: Task) => {
			if (!displayedAppState) return;

			const now = new Date().toISOString();
			const optimisticActiveTasks = displayedActiveTasks.filter(
				(activeTask) => activeTask.id !== task.id,
			);
			const completedTask: Task = {
				...task,
				status: "completed",
				completed_at: now,
				updated_at: now,
			};

			await runOptimisticUpdate(
				{
					activeTasks: optimisticActiveTasks,
					completedTasks: [completedTask, ...displayedCompletedTasks],
					appState: displayedAppState,
					totalPages: getVisibleTotalPages(optimisticActiveTasks),
				},
				async () => {
					await markTaskDone(task.id, task.total_time_ms);
				},
			);
		},
		[
			displayedActiveTasks,
			displayedAppState,
			displayedCompletedTasks,
			runOptimisticUpdate,
		],
	);

	const handleDeleteTask = useCallback(
		async (taskId: string) => {
			if (!displayedAppState) return;

			const deletedActiveTask = displayedActiveTasks.find(
				(t) => t.id === taskId,
			);
			const deletingCompletedTask = displayedCompletedTasks.some(
				(task) => task.id === taskId,
			);

			if (!deletedActiveTask && !deletingCompletedTask) return;

			const optimisticActiveTasks = deletedActiveTask
				? [
						...displayedActiveTasks
							.filter((task) => task.id !== taskId)
							.filter(
								(task) => task.page_number >= deletedActiveTask.page_number,
							)
							.sort(
								(a, b) =>
									a.page_number - b.page_number || a.position - b.position,
							)
							.map((task, index) => ({
								...task,
								page_number:
									Math.floor(index / 12) + deletedActiveTask.page_number,
								position: index % 12,
							})),
						...displayedActiveTasks.filter(
							(task) => task.page_number < deletedActiveTask.page_number,
						),
					].sort(
						(a, b) => a.page_number - b.page_number || a.position - b.position,
					)
				: displayedActiveTasks;

			const optimisticCompletedTasks = displayedCompletedTasks.filter(
				(task) => task.id !== taskId,
			);

			const deletingWorkingTask =
				displayedAppState.working_on_task_id === taskId;
			const now = new Date().toISOString();

			if (deletedActiveTask) {
				// Clear prefetch cache to force refresh after list reflow
				setPrefetchedTasks(new Map());
			}

			await runOptimisticUpdate(
				{
					activeTasks: optimisticActiveTasks,
					completedTasks: optimisticCompletedTasks,
					appState: deletingWorkingTask
						? {
								...displayedAppState,
								working_on_task_id: null,
								timer_state: "idle",
								current_session_ms: 0,
								session_start_time: null,
								updated_at: now,
							}
						: displayedAppState,
					totalPages: getVisibleTotalPages(optimisticActiveTasks),
				},
				async () => {
					await deleteTask(taskId);
					if (deletingWorkingTask) {
						await stopWorkingOnTask();
					}
				},
			);
		},
		[
			displayedActiveTasks,
			displayedAppState,
			displayedCompletedTasks,
			runOptimisticUpdate,
		],
	);

	const handleReenterTask = useCallback(
		async (task: Task) => {
			const remainingActiveTasks = displayedActiveTasks.filter(
				(activeTask) => activeTask.id !== task.id,
			);
			const placement = getNextTaskPlacement(
				remainingActiveTasks,
				DEFAULT_TASK_CAPACITY,
			);

			await reenterTask(
				task.id,
				task.text,
				placement.pageNumber,
				placement.position,
				task.total_time_ms,
			);
			await markTaskDone(task.id, task.total_time_ms);
			await refreshAll();
		},
		[displayedActiveTasks, refreshAll],
	);

	const handleRunTimer = useCallback(async () => {
		if (!displayedAppState) return;

		const now = new Date().toISOString();

		await runOptimisticUpdate(
			{
				activeTasks: displayedActiveTasks,
				completedTasks: displayedCompletedTasks,
				appState: {
					...displayedAppState,
					timer_state: "running",
					session_start_time: now,
					updated_at: now,
				},
				totalPages: displayedTotalPages,
			},
			async () => {
				await resumeTimer();
			},
		);
	}, [
		displayedActiveTasks,
		displayedAppState,
		displayedCompletedTasks,
		displayedTotalPages,
		runOptimisticUpdate,
	]);

	const handlePauseTimer = useCallback(
		async (sessionMs: number) => {
			if (!displayedAppState) return;

			const now = new Date().toISOString();

			await runOptimisticUpdate(
				{
					activeTasks: displayedActiveTasks,
					completedTasks: displayedCompletedTasks,
					appState: {
						...displayedAppState,
						timer_state: "paused",
						current_session_ms: sessionMs,
						updated_at: now,
					},
					totalPages: displayedTotalPages,
				},
				async () => {
					await pauseTimer(sessionMs);
				},
			);
		},
		[
			displayedActiveTasks,
			displayedAppState,
			displayedCompletedTasks,
			displayedTotalPages,
			runOptimisticUpdate,
		],
	);

	const handleStopTimer = useCallback(
		async (task: Task, sessionMs: number) => {
			if (!displayedAppState) return;

			const now = new Date().toISOString();
			const optimisticActiveTasks = displayedActiveTasks.map((activeTask) =>
				activeTask.id === task.id
					? {
							...activeTask,
							total_time_ms: activeTask.total_time_ms + sessionMs,
							updated_at: now,
						}
					: activeTask,
			);

			await runOptimisticUpdate(
				{
					activeTasks: optimisticActiveTasks,
					completedTasks: displayedCompletedTasks,
					appState: {
						...displayedAppState,
						timer_state: "stopped",
						current_session_ms: 0,
						session_start_time: null,
						updated_at: now,
					},
					totalPages: displayedTotalPages,
				},
				async () => {
					await stopTimer(task.id, sessionMs);
				},
			);
		},
		[
			displayedActiveTasks,
			displayedAppState,
			displayedCompletedTasks,
			displayedTotalPages,
			runOptimisticUpdate,
		],
	);

	const handleCompleteWorkingTask = useCallback(
		async (task: Task, sessionMs: number) => {
			if (!displayedAppState) return;

			const now = new Date().toISOString();
			const totalTime = task.total_time_ms + sessionMs;
			const optimisticActiveTasks = displayedActiveTasks.filter(
				(activeTask) => activeTask.id !== task.id,
			);
			const completedTask: Task = {
				...task,
				status: "completed",
				completed_at: now,
				total_time_ms: totalTime,
				updated_at: now,
			};

			await runOptimisticUpdate(
				{
					activeTasks: optimisticActiveTasks,
					completedTasks: [completedTask, ...displayedCompletedTasks],
					appState: {
						...displayedAppState,
						working_on_task_id: null,
						timer_state: "idle",
						current_session_ms: 0,
						session_start_time: null,
						updated_at: now,
					},
					totalPages: getVisibleTotalPages(optimisticActiveTasks),
				},
				async () => {
					await completeTask(task.id, totalTime);
					await stopWorkingOnTask();
				},
			);
		},
		[
			displayedActiveTasks,
			displayedAppState,
			displayedCompletedTasks,
			runOptimisticUpdate,
		],
	);

	const handleCancelWorkingTask = useCallback(
		async (task: Task, sessionMs: number) => {
			if (!displayedAppState) return;

			const now = new Date().toISOString();
			const shouldPersistSession =
				displayedAppState.timer_state === "running" ||
				displayedAppState.timer_state === "paused";
			const optimisticActiveTasks = displayedActiveTasks.map((activeTask) =>
				activeTask.id === task.id
					? {
							...activeTask,
							status: "active",
							total_time_ms:
								activeTask.total_time_ms +
								(shouldPersistSession ? sessionMs : 0),
							updated_at: now,
						}
					: activeTask,
			);

			await runOptimisticUpdate(
				{
					activeTasks: optimisticActiveTasks,
					completedTasks: displayedCompletedTasks,
					appState: {
						...displayedAppState,
						working_on_task_id: null,
						timer_state: "idle",
						current_session_ms: 0,
						session_start_time: null,
						updated_at: now,
					},
					totalPages: displayedTotalPages,
				},
				async () => {
					if (shouldPersistSession && sessionMs > 0) {
						await stopTimer(task.id, sessionMs);
					}

					await updateTask(task.id, { status: "active" });
					await stopWorkingOnTask();
				},
			);
		},
		[
			displayedActiveTasks,
			displayedAppState,
			displayedCompletedTasks,
			displayedTotalPages,
			runOptimisticUpdate,
		],
	);

	const handlePanelReenterTask = useCallback(
		async (task: Task) => {
			if (!displayedAppState) return;

			const now = new Date().toISOString();
			const remainingActiveTasks = displayedActiveTasks.filter(
				(activeTask) => activeTask.id !== task.id,
			);
			const placement = getNextTaskPlacement(
				remainingActiveTasks,
				DEFAULT_TASK_CAPACITY,
			);

			const reenteredTask: Task = {
				...task,
				id: crypto.randomUUID(),
				page_number: placement.pageNumber,
				position: placement.position,
				status: "active",
				re_entered_from: task.id,
				added_at: now,
				completed_at: null,
				updated_at: now,
			};

			const completedTask: Task = {
				...task,
				status: "completed",
				completed_at: now,
				updated_at: now,
			};

			const optimisticActiveTasks = [
				...remainingActiveTasks,
				reenteredTask,
			].sort(
				(a, b) => a.page_number - b.page_number || a.position - b.position,
			);

			await runOptimisticUpdate(
				{
					activeTasks: optimisticActiveTasks,
					completedTasks: [completedTask, ...displayedCompletedTasks],
					appState: {
						...displayedAppState,
						working_on_task_id: null,
						timer_state: "idle",
						current_session_ms: 0,
						session_start_time: null,
						updated_at: now,
					},
					totalPages: getVisibleTotalPages(optimisticActiveTasks),
				},
				async () => {
					await reenterTask(
						task.id,
						task.text,
						placement.pageNumber,
						placement.position,
						task.total_time_ms,
					);
					await markTaskDone(task.id, task.total_time_ms);
					await stopWorkingOnTask();
				},
			);
		},
		[
			displayedActiveTasks,
			displayedAppState,
			displayedCompletedTasks,
			runOptimisticUpdate,
		],
	);

	const handleSwitchTask = useCallback(
		async (newTask: Task, action: "complete" | "reenter") => {
			if (!displayedAppState?.working_on_task_id) return;

			const workingTask = displayedActiveTasks.find(
				(t) => t.id === displayedAppState.working_on_task_id,
			);
			if (!workingTask) return;

			const nowDate = new Date();
			const now = nowDate.toISOString();
			const sessionMs = getCurrentSessionMs(
				displayedAppState,
				nowDate.getTime(),
			);
			const totalTime = workingTask.total_time_ms + sessionMs;

			if (action === "complete") {
				const optimisticActiveTasks = displayedActiveTasks
					.filter((t) => t.id !== workingTask.id)
					.map((t) =>
						t.id === newTask.id
							? { ...t, status: "in-progress", updated_at: now }
							: t,
					);

				const completedTask: Task = {
					...workingTask,
					status: "completed",
					completed_at: now,
					total_time_ms: totalTime,
					updated_at: now,
				};

				await runOptimisticUpdate(
					{
						activeTasks: optimisticActiveTasks,
						completedTasks: [completedTask, ...displayedCompletedTasks],
						appState: {
							...displayedAppState,
							working_on_task_id: newTask.id,
							timer_state: "idle",
							current_session_ms: 0,
							session_start_time: null,
							updated_at: now,
						},
						totalPages: getVisibleTotalPages(optimisticActiveTasks),
					},
					async () => {
						await markTaskDone(workingTask.id, totalTime);
						await startTask(newTask.id);
					},
				);
			} else {
				// Re-enter
				const remainingActiveTasks = displayedActiveTasks.filter(
					(t) => t.id !== workingTask.id,
				);
				const placement = getNextTaskPlacement(
					remainingActiveTasks,
					DEFAULT_TASK_CAPACITY,
				);

				const reenteredTask: Task = {
					...workingTask,
					id: crypto.randomUUID(),
					page_number: placement.pageNumber,
					position: placement.position,
					status: "active",
					total_time_ms: totalTime,
					re_entered_from: workingTask.id,
					added_at: now,
					completed_at: null,
					updated_at: now,
				};

				const optimisticActiveTasks = [
					...displayedActiveTasks
						.filter((t) => t.id !== workingTask.id)
						.map((t) =>
							t.id === newTask.id
								? { ...t, status: "in-progress", updated_at: now }
								: t,
						),
					reenteredTask,
				].sort(
					(a, b) => a.page_number - b.page_number || a.position - b.position,
				);

				const completedTask: Task = {
					...workingTask,
					status: "completed",
					completed_at: now,
					total_time_ms: totalTime,
					updated_at: now,
				};

				await runOptimisticUpdate(
					{
						activeTasks: optimisticActiveTasks,
						completedTasks: [completedTask, ...displayedCompletedTasks],
						appState: {
							...displayedAppState,
							working_on_task_id: newTask.id,
							timer_state: "idle",
							current_session_ms: 0,
							session_start_time: null,
							updated_at: now,
						},
						totalPages: getVisibleTotalPages(optimisticActiveTasks),
					},
					async () => {
						await reenterTask(
							workingTask.id,
							workingTask.text,
							placement.pageNumber,
							placement.position,
							totalTime,
						);
						await markTaskDone(workingTask.id, totalTime);
						await startTask(newTask.id);
					},
				);
			}
		},
		[
			displayedActiveTasks,
			displayedAppState,
			displayedCompletedTasks,
			runOptimisticUpdate,
		],
	);

	// Auto-navigate to the page with the working task
	useEffect(() => {
		if (workingTask && workingTask.page_number !== currentPage) {
			setCurrentPage(workingTask.page_number);
		}
	}, [workingTask, currentPage]);

	// Ensure current page is valid
	useEffect(() => {
		if (currentPage > displayedTotalPages && displayedTotalPages > 0) {
			setCurrentPage(displayedTotalPages);
		}
	}, [currentPage, displayedTotalPages]);

	// Keep a fallback viewport estimate until the task list reports exact capacity.
	useEffect(() => {
		const handleResize = () => {
			setVisibleTaskCapacity(12);
		};

		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	if (!displayedAppState) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-muted-foreground">Loading...</div>
			</div>
		);
	}

	return (
		<div className="h-screen overflow-hidden bg-background text-foreground flex flex-col">
			<Header />

			<TimerBar
				appState={displayedAppState}
				workingTask={workingTask}
				onStartTimer={handleRunTimer}
				onPauseTimer={handlePauseTimer}
				onResumeTimer={handleRunTimer}
				onStopTimer={handleStopTimer}
				onCompleteTask={handleCompleteWorkingTask}
				onCancelTask={handleCancelWorkingTask}
				onReenterTask={handlePanelReenterTask}
			/>

			<ViewTabs activeView={activeView} onViewChange={setActiveView} />

			{activeView === "tasks" && (
				<PageNav
					currentPage={currentPage}
					totalPages={displayedTotalPages}
					onPageChange={setCurrentPage}
				/>
			)}

			<main className="flex-1 flex flex-col min-h-0">
				{activeView === "tasks" ? (
					<TaskList
						tasks={tasksForCurrentPage}
						allTasks={displayedActiveTasks}
						workingTaskId={displayedAppState.working_on_task_id}
						onRefresh={refreshAll}
						onStartTask={handleStartTask}
						onDoneTask={handleDoneTask}
						onDeleteTask={handleDeleteTask}
						onReenterTask={handleReenterTask}
						onReorderTasks={handleReorderTasks}
						onSwitchTask={handleSwitchTask}
						onVisibleCapacityChange={handleVisibleTaskCapacityChange}
					/>
				) : (
					<CompletedList
						tasks={displayedCompletedTasks}
						onRefresh={refreshAll}
						onDeleteTask={handleDeleteTask}
					/>
				)}
			</main>

			{activeView === "tasks" && (
				<>
					<TaskInput onAddTask={handleAddTask} />
					<BacklogDump onAddTasks={handleAddTasks} />
				</>
			)}

			<AboutSection />
		</div>
	);
}
