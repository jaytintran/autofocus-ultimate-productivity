"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import useSWR from "swr";
import { Header } from "./header";
import { TimerBar } from "./timer-bar";
import { ViewTabs } from "./view-tabs";
import { PageNav } from "./page-nav";
import { TaskList } from "./task-list";
import { CompletedList } from "./completed-list";
import { TaskInput } from "./task-input";
// import { BacklogDump } from "./backlog-dump";
// import { AboutSection } from "./about-section";
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
import { type CompletedSortKey } from "./view-tabs";

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

function createOptimisticTask(
	text: string,
	placement: TaskPlacement,
	now: string,
): Task {
	return {
		id: crypto.randomUUID(),
		text,
		status: "active",
		page_number: placement.pageNumber,
		position: placement.position,
		added_at: now,
		completed_at: null,
		total_time_ms: 0,
		re_entered_from: null,
		created_at: now,
		updated_at: now,
	};
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
	const draggedTaskIndex = tasks.findIndex((task) => task.id === draggedTaskId);
	const targetTaskIndex = tasks.findIndex((task) => task.id === targetTaskId);

	if (
		draggedTaskIndex === -1 ||
		targetTaskIndex === -1 ||
		draggedTaskIndex === targetTaskIndex
	) {
		return null;
	}

	const reorderedTasks = [...tasks];
	const [draggedTask] = reorderedTasks.splice(draggedTaskIndex, 1);
	reorderedTasks.splice(targetTaskIndex, 0, draggedTask);

	// Recalculate page_number and position for all tasks
	const now = new Date().toISOString();
	const updates = reorderedTasks.map((task, index) => ({
		id: task.id,
		page_number: Math.floor(index / DEFAULT_TASK_CAPACITY) + 1,
		position: index % DEFAULT_TASK_CAPACITY,
	}));

	const updatesByTaskId = new Map(updates.map((update) => [update.id, update]));

	return {
		activeTasks: reorderedTasks.map((task) => {
			const update = updatesByTaskId.get(task.id);
			return update
				? {
						...task,
						page_number: update.page_number,
						position: update.position,
						updated_at: now,
					}
				: task;
		}),
		updates,
	};
}

export function AutofocusApp() {
	const [activeView, setActiveView] = useState<"tasks" | "completed">("tasks");
	const [selectedTags, setSelectedTags] = useState<Set<TagId | "none">>(
		new Set(),
	);
	const [currentPage, setCurrentPage] = useState(1);
	const [filteredCurrentPage, setFilteredCurrentPage] = useState(1);
	const [optimisticState, setOptimisticState] =
		useState<OptimisticStateSnapshot | null>(null);
	const [visibleTaskCapacity, setVisibleTaskCapacity] = useState(12);
	const [prefetchedTasks, setPrefetchedTasks] = useState<Map<number, Task[]>>(
		new Map(),
	);
	const [hasInitializedFilter, setHasInitializedFilter] = useState(false);
	const [completedSort, setCompletedSort] =
		useState<CompletedSortKey>("default");

	// Fetch active tasks
	const { data: activeTasks = [], mutate: mutateActive } = useSWR<Task[]>(
		"active-tasks",
		getActiveTasks,
		{ refreshInterval: 0 },
	);

	// Fetch completed tasks
	const [completedPage, setCompletedPage] = useState(1);
	const [allCompletedTasks, setAllCompletedTasks] = useState<Task[]>([]);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [hasMoreCompleted, setHasMoreCompleted] = useState(true);

	const { data: initialCompletedTasks = [], mutate: mutateCompleted } = useSWR<
		Task[]
	>("completed-tasks", () => getCompletedTasks(1), {
		refreshInterval: 0,
		onSuccess: (data) => {
			setAllCompletedTasks(data);
			setHasMoreCompleted(data.length === 50);
			setCompletedPage(1);
		},
	});

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

	// Initialize filter from default preference
	useEffect(() => {
		if (appState && !hasInitializedFilter) {
			if (appState.default_filter === "none") {
				setSelectedTags(new Set(["none"]));
			}
			setHasInitializedFilter(true);
		}
	}, [appState, hasInitializedFilter]);

	const displayedActiveTasks = optimisticState?.activeTasks ?? activeTasks;
	const displayedCompletedTasks =
		optimisticState?.completedTasks ?? allCompletedTasks;
	const displayedAppState = optimisticState?.appState ?? appState;
	const displayedTotalPages = optimisticState?.totalPages ?? totalPages;

	// Determine if filter is active
	const isFilterActive = selectedTags.size > 0;

	// Filter active tasks by selected tags
	const filteredActiveTasks = useMemo(() => {
		if (!isFilterActive) return displayedActiveTasks;

		return displayedActiveTasks.filter((task) => {
			if (selectedTags.has("none")) {
				return task.tag === null;
			}
			return task.tag && selectedTags.has(task.tag);
		});
	}, [displayedActiveTasks, selectedTags, isFilterActive]);

	// Calculate filtered total pages
	const filteredTotalPages = useMemo(() => {
		if (!isFilterActive) return displayedTotalPages;
		return Math.max(
			1,
			Math.ceil(filteredActiveTasks.length / DEFAULT_TASK_CAPACITY),
		);
	}, [isFilterActive, filteredActiveTasks.length, displayedTotalPages]);

	// Use filtered page and total when filter is active
	const effectiveCurrentPage = isFilterActive
		? filteredCurrentPage
		: currentPage;
	const effectiveTotalPages = isFilterActive
		? filteredTotalPages
		: displayedTotalPages;

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
		const sourceList = isFilterActive
			? filteredActiveTasks
			: displayedActiveTasks;
		const pageNum = effectiveCurrentPage;

		if (optimisticState && !isFilterActive) {
			return optimisticState.activeTasks
				.filter((task) => task.page_number === pageNum)
				.sort((a, b) => a.position - b.position);
		}

		if (isFilterActive) {
			// For filtered view, re-paginate the filtered list
			const startIndex = (pageNum - 1) * DEFAULT_TASK_CAPACITY;
			const endIndex = startIndex + DEFAULT_TASK_CAPACITY;
			return sourceList.slice(startIndex, endIndex);
		}

		const currentPageTasks = sourceList
			.filter((task) => task.page_number === pageNum)
			.sort((a, b) => a.position - b.position);

		if (optimisticState) {
			return currentPageTasks;
		}

		if (activeTasks.length > 0) {
			return currentPageTasks;
		}

		// Fall back to prefetched data only before the full active task list loads.
		const prefetched = prefetchedTasks.get(pageNum);
		if (prefetched && prefetched.length > 0) {
			return [...prefetched].sort((a, b) => a.position - b.position);
		}

		return currentPageTasks;
	}, [
		activeTasks.length,
		effectiveCurrentPage,
		displayedActiveTasks,
		filteredActiveTasks,
		isFilterActive,
		optimisticState,
		prefetchedTasks,
	]);

	// Get the working task
	const workingTask = displayedAppState?.working_on_task_id
		? displayedActiveTasks.find(
				(t) => t.id === displayedAppState.working_on_task_id,
			) || null
		: null;

	// Refresh all data
	const refreshAll = useCallback(async () => {
		setCompletedPage(1);
		setHasMoreCompleted(true);
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
		async (text: string, tag?: TagId | null) => {
			const trimmedText = text.trim();
			if (!trimmedText || !displayedAppState) return;

			const now = new Date().toISOString();
			const optimisticTask = {
				id: crypto.randomUUID(),
				text: trimmedText,
				status: "active" as const,
				page_number: 1,
				position: 0,
				added_at: now,
				completed_at: null,
				total_time_ms: 0,
				re_entered_from: null,
				created_at: now,
				updated_at: now,
				tag: tag ?? null,
			};

			// Shift all existing tasks down by 1 position
			const shiftedTasks = displayedActiveTasks.map((task, index) => ({
				...task,
				page_number: Math.floor((index + 1) / DEFAULT_TASK_CAPACITY) + 1,
				position: (index + 1) % DEFAULT_TASK_CAPACITY,
				updated_at: now,
			}));

			const optimisticActiveTasks = [optimisticTask, ...shiftedTasks];

			setPrefetchedTasks(new Map());
			setCurrentPage(1);

			// Set optimistic state immediately
			setOptimisticState({
				activeTasks: optimisticActiveTasks,
				completedTasks: displayedCompletedTasks,
				appState: displayedAppState,
				totalPages: getVisibleTotalPages(optimisticActiveTasks),
			});

			// Fire and forget - don't await
			addTask(trimmedText, 1, 0, tag ?? null)
				.then(async () => {
					await mutateActive();
					await mutateTotalPages();
					// Clear optimistic state AFTER mutations complete
					setOptimisticState(null);
				})
				.catch(async (error) => {
					console.error("Failed to add task:", error);
					await mutateActive();
					await mutateTotalPages();
					setOptimisticState(null);
				});
		},
		[
			displayedActiveTasks,
			displayedAppState,
			displayedCompletedTasks,
			mutateActive,
			mutateTotalPages,
		],
	);

	const handleAddTasks = useCallback(
		async (taskTexts: string[], tag?: TagId | null) => {
			if (!displayedAppState) return;

			const trimmedTaskTexts = taskTexts
				.map((taskText) => taskText.trim())
				.filter((taskText) => taskText.length > 0);

			if (trimmedTaskTexts.length === 0) return;

			const now = new Date().toISOString();

			// Create new tasks at the top (positions 0, 1, 2, ...)
			const newTasks = trimmedTaskTexts.map((taskText, index) => ({
				id: crypto.randomUUID(),
				text: taskText,
				status: "active" as const,
				page_number: Math.floor(index / DEFAULT_TASK_CAPACITY) + 1,
				position: index % DEFAULT_TASK_CAPACITY,
				added_at: now,
				completed_at: null,
				total_time_ms: 0,
				re_entered_from: null,
				created_at: now,
				updated_at: now,
				tag: tag ?? null,
			}));

			// Shift all existing tasks down
			const shiftedTasks = displayedActiveTasks.map((task, index) => {
				const newIndex = index + trimmedTaskTexts.length;
				return {
					...task,
					page_number: Math.floor(newIndex / DEFAULT_TASK_CAPACITY) + 1,
					position: newIndex % DEFAULT_TASK_CAPACITY,
					updated_at: now,
				};
			});

			const optimisticActiveTasks = [...newTasks, ...shiftedTasks];

			const tasksToAdd = trimmedTaskTexts.map((taskText, index) => ({
				text: taskText,
				pageNumber: Math.floor(index / DEFAULT_TASK_CAPACITY) + 1,
				position: index % DEFAULT_TASK_CAPACITY,
				tag: tag ?? null,
			}));

			setPrefetchedTasks(new Map());
			setCurrentPage(1);

			// Set optimistic state immediately
			setOptimisticState({
				activeTasks: optimisticActiveTasks,
				completedTasks: displayedCompletedTasks,
				appState: displayedAppState,
				totalPages: getVisibleTotalPages(optimisticActiveTasks),
			});

			// Fire and forget - don't await
			addMultipleTasks(tasksToAdd)
				.then(async () => {
					await mutateActive();
					await mutateTotalPages();
					// Clear optimistic state AFTER mutations complete
					setOptimisticState(null);
				})
				.catch(async (error) => {
					console.error("Failed to add tasks:", error);
					await mutateActive();
					await mutateTotalPages();
					setOptimisticState(null);
				});
		},
		[
			displayedActiveTasks,
			displayedAppState,
			displayedCompletedTasks,
			mutateActive,
			mutateTotalPages,
		],
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
			const optimisticActiveTasks = displayedActiveTasks
				.filter((activeTask) => activeTask.id !== task.id)
				.sort(
					(a, b) => a.page_number - b.page_number || a.position - b.position,
				)
				.map((t, index) => ({
					...t,
					page_number: Math.floor(index / DEFAULT_TASK_CAPACITY) + 1,
					position: index % DEFAULT_TASK_CAPACITY,
					updated_at: now,
				}));

			const completedTask: Task = {
				...task,
				status: "completed",
				completed_at: now,
				updated_at: now,
			};

			setPrefetchedTasks(new Map()); // ← ADD THIS

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
				setPrefetchedTasks(new Map());
			}

			// Set optimistic state immediately
			setOptimisticState({
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
			});

			// Fire and forget - don't await
			deleteTask(taskId)
				.then(async () => {
					if (deletingWorkingTask) {
						await stopWorkingOnTask();
					}
					await refreshAll();
					setOptimisticState(null);
				})
				.catch(async (error) => {
					console.error("Failed to delete task:", error);
					await refreshAll();
					setOptimisticState(null);
				});
		},
		[
			displayedActiveTasks,
			displayedAppState,
			displayedCompletedTasks,
			refreshAll,
		],
	);

	const handleReenterTaskOldOld = useCallback(
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

	const handleReenterTaskOld = useCallback(
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

			setPrefetchedTasks(new Map());

			await runOptimisticUpdate(
				{
					activeTasks: optimisticActiveTasks,
					completedTasks: [completedTask, ...displayedCompletedTasks],
					appState: displayedAppState,
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

			// Re-index remaining tasks to close the gap, then append re-entered task at end
			const reindexedRemaining = remainingActiveTasks
				.sort(
					(a, b) => a.page_number - b.page_number || a.position - b.position,
				)
				.map((t, index) => ({
					...t,
					page_number: Math.floor(index / DEFAULT_TASK_CAPACITY) + 1,
					position: index % DEFAULT_TASK_CAPACITY,
					updated_at: now,
				}));

			// Recompute placement based on re-indexed remaining tasks
			const reindexedPlacement = getNextTaskPlacement(
				reindexedRemaining,
				DEFAULT_TASK_CAPACITY,
			);

			const reenteredTaskFinal: Task = {
				...reenteredTask,
				page_number: reindexedPlacement.pageNumber,
				position: reindexedPlacement.position,
			};

			const optimisticActiveTasks = [...reindexedRemaining, reenteredTaskFinal];

			setPrefetchedTasks(new Map());

			await runOptimisticUpdate(
				{
					activeTasks: optimisticActiveTasks,
					completedTasks: [completedTask, ...displayedCompletedTasks],
					appState: displayedAppState,
					totalPages: getVisibleTotalPages(optimisticActiveTasks),
				},
				async () => {
					await reenterTask(
						task.id,
						task.text,
						reindexedPlacement.pageNumber,
						reindexedPlacement.position,
						task.total_time_ms,
					);
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

	/* handleCompleteWorkingTaskOld
	const handleCompleteWorkingTaskOld = useCallback(
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
	*/

	const handleCompleteWorkingTask = useCallback(
		async (task: Task, sessionMs: number) => {
			if (!displayedAppState) return;

			const now = new Date().toISOString();
			const totalTime = task.total_time_ms + sessionMs;

			const optimisticActiveTasks = displayedActiveTasks
				.filter((activeTask) => activeTask.id !== task.id)
				.sort(
					(a, b) => a.page_number - b.page_number || a.position - b.position,
				)
				.map((t, index) => ({
					...t,
					page_number: Math.floor(index / DEFAULT_TASK_CAPACITY) + 1,
					position: index % DEFAULT_TASK_CAPACITY,
					updated_at: now,
				}));

			const completedTask: Task = {
				...task,
				status: "completed",
				completed_at: now,
				total_time_ms: totalTime,
				updated_at: now,
			};

			setPrefetchedTasks(new Map()); // ← ADD THIS

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

	/* handlePanelReenterTaskOld
	const handlePanelReenterTaskOld = useCallback(
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
	 */

	const handlePanelReenterTask = useCallback(
		async (task: Task) => {
			if (!displayedAppState) return;

			const now = new Date().toISOString();
			const remainingActiveTasks = displayedActiveTasks.filter(
				(activeTask) => activeTask.id !== task.id,
			);

			// Re-index remaining to close the gap first
			const reindexedRemaining = remainingActiveTasks
				.sort(
					(a, b) => a.page_number - b.page_number || a.position - b.position,
				)
				.map((t, index) => ({
					...t,
					page_number: Math.floor(index / DEFAULT_TASK_CAPACITY) + 1,
					position: index % DEFAULT_TASK_CAPACITY,
					updated_at: now,
				}));

			// Compute placement from re-indexed list
			const placement = getNextTaskPlacement(
				reindexedRemaining,
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

			const optimisticActiveTasks = [...reindexedRemaining, reenteredTask];

			setPrefetchedTasks(new Map());

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

	/* handleSwitchTaskOld
	const handleSwitchTaskOld = useCallback(
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

				setPrefetchedTasks(new Map());

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
	*/

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
				// Re-index remaining after removing working task
				const reindexedRemaining = displayedActiveTasks
					.filter((t) => t.id !== workingTask.id)
					.sort(
						(a, b) => a.page_number - b.page_number || a.position - b.position,
					)
					.map((t, index) => ({
						...t,
						page_number: Math.floor(index / DEFAULT_TASK_CAPACITY) + 1,
						position: index % DEFAULT_TASK_CAPACITY,
						updated_at: now,
					}));

				const optimisticActiveTasks = reindexedRemaining.map((t) =>
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

				setPrefetchedTasks(new Map());

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
				// Re-enter branch
				const reindexedRemaining = displayedActiveTasks
					.filter((t) => t.id !== workingTask.id)
					.sort(
						(a, b) => a.page_number - b.page_number || a.position - b.position,
					)
					.map((t, index) => ({
						...t,
						page_number: Math.floor(index / DEFAULT_TASK_CAPACITY) + 1,
						position: index % DEFAULT_TASK_CAPACITY,
						updated_at: now,
					}));

				const placement = getNextTaskPlacement(
					reindexedRemaining,
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
					...reindexedRemaining.map((t) =>
						t.id === newTask.id
							? { ...t, status: "in-progress", updated_at: now }
							: t,
					),
					reenteredTask,
				];

				const completedTask: Task = {
					...workingTask,
					status: "completed",
					completed_at: now,
					total_time_ms: totalTime,
					updated_at: now,
				};

				setPrefetchedTasks(new Map());

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

	// Handle load more completed tasks
	const handleLoadMoreCompleted = useCallback(async () => {
		if (isLoadingMore || !hasMoreCompleted) return;
		setIsLoadingMore(true);
		try {
			const nextPage = completedPage + 1;
			const moreTasks = await getCompletedTasks(nextPage);
			setAllCompletedTasks((prev) => [...prev, ...moreTasks]);
			setCompletedPage(nextPage);
			setHasMoreCompleted(moreTasks.length === 50);
		} finally {
			setIsLoadingMore(false);
		}
	}, [isLoadingMore, hasMoreCompleted, completedPage]);

	// Auto-navigate to the working task's page only when it first becomes active
	const prevWorkingTaskIdRef = useRef<string | null>(null);

	useEffect(() => {
		const currentWorkingId = displayedAppState?.working_on_task_id ?? null;

		// Only navigate when working task changes to a new task (not on every render)
		if (
			currentWorkingId &&
			currentWorkingId !== prevWorkingTaskIdRef.current &&
			workingTask
		) {
			setCurrentPage(workingTask.page_number);
		}

		prevWorkingTaskIdRef.current = currentWorkingId;
	}, [displayedAppState?.working_on_task_id, workingTask]);

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

	// Reset filtered page to 1 when filter changes
	useEffect(() => {
		setFilteredCurrentPage(1);
	}, [selectedTags]);

	// Ensure filtered current page is valid
	useEffect(() => {
		if (
			isFilterActive &&
			filteredCurrentPage > filteredTotalPages &&
			filteredTotalPages > 0
		) {
			setFilteredCurrentPage(filteredTotalPages);
		}
	}, [isFilterActive, filteredCurrentPage, filteredTotalPages]);

	const handleToggleTag = useCallback((tagId: TagId | "none") => {
		setSelectedTags((prev) => {
			const next = new Set(prev);
			if (next.has(tagId)) {
				next.delete(tagId);
			} else {
				next.add(tagId);
			}
			return next;
		});
	}, []);

	const handlePageChange = useCallback(
		(page: number) => {
			if (isFilterActive) {
				setFilteredCurrentPage(page);
			} else {
				setCurrentPage(page);
			}
		},
		[isFilterActive],
	);

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

			<ViewTabs
				activeView={activeView}
				onViewChange={setActiveView}
				selectedTags={selectedTags}
				onToggleTag={handleToggleTag}
				onAddTasks={handleAddTasks}
				completedSort={completedSort}
				onCompletedSortChange={setCompletedSort}
			/>

			{activeView === "tasks" && (
				<PageNav
					currentPage={effectiveCurrentPage}
					totalPages={effectiveTotalPages}
					onPageChange={handlePageChange}
					isFiltered={isFilterActive}
				/>
			)}

			<main className="flex-1 flex flex-col min-h-0 pb-24">
				{activeView === "tasks" ? (
					<TaskList
						tasks={tasksForCurrentPage}
						allTasks={displayedActiveTasks}
						workingTaskId={displayedAppState.working_on_task_id}
						selectedTags={selectedTags}
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
						selectedTags={selectedTags}
						completedSort={completedSort}
						hasMore={hasMoreCompleted}
						isLoadingMore={isLoadingMore}
						onLoadMore={handleLoadMoreCompleted}
						onRefresh={refreshAll}
						onDeleteTask={handleDeleteTask}
					/>
				)}
			</main>

			{activeView === "tasks" && (
				<>
					<TaskInput onAddTask={handleAddTask} selectedTags={selectedTags} />
				</>
			)}
		</div>
	);
}
