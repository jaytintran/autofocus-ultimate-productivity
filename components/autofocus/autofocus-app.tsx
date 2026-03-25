"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

import useSWR from "swr";
import { Header } from "./header";
import { TimerBar } from "./timer-bar";
import { ViewTabs } from "./view-tabs";
import { PageNav } from "./page-nav";
import { TaskList } from "./task-list";
import { CompletedList } from "./completed-list";
import { TaskInput } from "./task-input";
import {
	addMultipleTasks,
	addTask,
	completeTask,
	deleteTask,
	getActiveTasks,
	getAppState,
	getCompletedTasks,
	getTasksForPage,
	getTasksWithNotes,
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
	updateTaskTag,
} from "@/lib/store";
import type { Task, AppState, TaskStatus } from "@/lib/types";
import { type CompletedSortKey, type CompletedViewType } from "./view-tabs";
import { TAG_DEFINITIONS, TagId } from "@/lib/tags";
import { revertTask } from "@/lib/store";

import { ContentFilterBar } from "./content-filter-bar";
import {
	applyContentFilter,
	type ContentFilterOption,
} from "@/lib/content-filter";

const DEFAULT_TASK_CAPACITY = 12;

const ACHIEVEMENT_PLACEHOLDERS = [
	"What went better than expected?",
	"Any unexpected wins?",
	"Anything worth noting?",
	"A small win? Write it down.",
	"Did anything surprise you?",
	"The smallest step you achieved?",
];

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
		status: "active" as TaskStatus,
		page_number: placement.pageNumber,
		position: placement.position,
		added_at: now,
		completed_at: null,
		total_time_ms: 0,
		re_entered_from: null,
		tag: null,
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
	const [completedViewType, setCompletedViewType] =
		useState<CompletedViewType>("default");

	const [contentFilter, setContentFilter] =
		useState<ContentFilterOption>("default");

	// Achievement toast state
	const [achievementPending, setAchievementPending] = useState<{
		task: Task;
		sessionMs: number;
		type: "done" | "complete";
	} | null>(null);
	const [achievementNote, setAchievementNote] = useState("");

	// Search query with debounce
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchQuery(searchQuery);
		}, 2500);
		return () => clearTimeout(timer);
	}, [searchQuery]);

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

	const [placeholderIndex, setPlaceholderIndex] = useState(0);
	const placeholderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
		null,
	);

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

	// Search filtered tasks
	const searchFilteredActiveTasks = useMemo(() => {
		if (!searchQuery.trim()) return filteredActiveTasks;
		const q = searchQuery.toLowerCase();
		return filteredActiveTasks.filter((task) =>
			task.text.toLowerCase().includes(q),
		);
	}, [filteredActiveTasks, debouncedSearchQuery]);

	// Calculate filtered total pages
	const filteredTotalPages = useMemo(() => {
		if (!isFilterActive && !searchQuery.trim()) return displayedTotalPages;
		return Math.max(
			1,
			Math.ceil(searchFilteredActiveTasks.length / DEFAULT_TASK_CAPACITY),
		);
	}, [
		isFilterActive,
		debouncedSearchQuery,
		searchFilteredActiveTasks.length,
		displayedTotalPages,
	]);

	// Use filtered page and total when filter is active
	const isSearchOrFilterActive =
		isFilterActive || !!debouncedSearchQuery.trim();

	const effectiveCurrentPage = isSearchOrFilterActive
		? filteredCurrentPage
		: currentPage;
	const effectiveTotalPages = isSearchOrFilterActive
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
	const tasksForCurrentPageOld = useMemo(() => {
		const pageNum = effectiveCurrentPage;

		if (optimisticState && !isSearchOrFilterActive) {
			return optimisticState.activeTasks
				.filter((task) => task.page_number === pageNum)
				.sort((a, b) => a.position - b.position);
		}

		if (isSearchOrFilterActive) {
			const startIndex = (pageNum - 1) * DEFAULT_TASK_CAPACITY;
			const endIndex = startIndex + DEFAULT_TASK_CAPACITY;
			return searchFilteredActiveTasks.slice(startIndex, endIndex);
		}

		const currentPageTasks = displayedActiveTasks
			.filter((task) => task.page_number === pageNum)
			.sort((a, b) => a.position - b.position);

		if (optimisticState) return currentPageTasks;
		if (activeTasks.length > 0) return currentPageTasks;

		const prefetched = prefetchedTasks.get(pageNum);
		if (prefetched && prefetched.length > 0) {
			return [...prefetched].sort((a, b) => a.position - b.position);
		}

		return currentPageTasks;
	}, [
		activeTasks.length,
		effectiveCurrentPage,
		displayedActiveTasks,
		searchFilteredActiveTasks,
		isSearchOrFilterActive,
		optimisticState,
		prefetchedTasks,
	]);

	const tasksForCurrentPage = useMemo(() => {
		const pageNum = effectiveCurrentPage;

		let pageTasks: Task[];

		if (optimisticState && !isSearchOrFilterActive) {
			pageTasks = optimisticState.activeTasks
				.filter((task) => task.page_number === pageNum)
				.sort((a, b) => a.position - b.position);
		} else if (isSearchOrFilterActive) {
			const startIndex = (pageNum - 1) * DEFAULT_TASK_CAPACITY;
			const endIndex = startIndex + DEFAULT_TASK_CAPACITY;
			pageTasks = searchFilteredActiveTasks.slice(startIndex, endIndex);
		} else {
			const currentPageTasks = displayedActiveTasks
				.filter((task) => task.page_number === pageNum)
				.sort((a, b) => a.position - b.position);

			if (optimisticState) {
				pageTasks = currentPageTasks;
			} else if (activeTasks.length > 0) {
				pageTasks = currentPageTasks;
			} else {
				const prefetched = prefetchedTasks.get(pageNum);
				pageTasks =
					prefetched && prefetched.length > 0
						? [...prefetched].sort((a, b) => a.position - b.position)
						: currentPageTasks;
			}
		}

		// ← NEW: apply keyword-based content filter as a final pass
		return applyContentFilter(pageTasks, contentFilter);
	}, [
		activeTasks.length,
		effectiveCurrentPage,
		displayedActiveTasks,
		searchFilteredActiveTasks,
		isSearchOrFilterActive,
		optimisticState,
		prefetchedTasks,
		contentFilter, // ← NEW dependency
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
			if (!trimmedText || !displayedAppState) return null;

			const now = new Date().toISOString();
			const optimisticTask = {
				id: crypto.randomUUID(),
				text: trimmedText,
				status: "active" as TaskStatus,
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

			try {
				const createdTask = await addTask(trimmedText, 1, 0, tag ?? null);
				await mutateActive();
				await mutateTotalPages();
				setOptimisticState(null);
				return createdTask;
			} catch (error) {
				console.error("Failed to add task:", error);
				await mutateActive();
				await mutateTotalPages();
				setOptimisticState(null);
				return null;
			}
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
				status: "active" as TaskStatus,
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
					? {
							...activeTask,
							status: "in-progress" as TaskStatus,
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

	const handlePumpTask = useCallback(
		async (taskId: string) => {
			if (!displayedAppState) return;

			const now = new Date().toISOString();
			const sorted = [...displayedActiveTasks].sort(
				(a, b) => a.page_number - b.page_number || a.position - b.position,
			);

			// Move target to front, keep rest in order
			const reordered = [
				sorted.find((t) => t.id === taskId)!,
				...sorted.filter((t) => t.id !== taskId),
			];

			const updates = reordered.map((task, index) => ({
				id: task.id,
				page_number: Math.floor(index / DEFAULT_TASK_CAPACITY) + 1,
				position: index % DEFAULT_TASK_CAPACITY,
			}));

			const updatedMap = new Map(updates.map((u) => [u.id, u]));
			const optimisticActiveTasks: Task[] = reordered.map((task) => {
				const u = updatedMap.get(task.id)!;
				return {
					...task,
					page_number: u.page_number,
					position: u.position,
					updated_at: now,
				};
			});

			setPrefetchedTasks(new Map());
			// setCurrentPage(1);

			await runOptimisticUpdate(
				{
					activeTasks: optimisticActiveTasks,
					completedTasks: displayedCompletedTasks,
					appState: displayedAppState,
					totalPages: getVisibleTotalPages(optimisticActiveTasks),
				},
				async () => {
					await reorderTasks(updates);
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

	const handleSinkTask = useCallback(
		async (taskId: string) => {
			if (!displayedAppState) return;

			const now = new Date().toISOString();

			const sorted = [...displayedActiveTasks].sort(
				(a, b) => a.page_number - b.page_number || a.position - b.position,
			);

			// Move target to end, keep rest in order
			const reordered = [
				...sorted.filter((t) => t.id !== taskId),
				sorted.find((t) => t.id === taskId)!,
			];

			const updates = reordered.map((task, index) => ({
				id: task.id,
				page_number: Math.floor(index / DEFAULT_TASK_CAPACITY) + 1,
				position: index % DEFAULT_TASK_CAPACITY,
			}));

			const updatedMap = new Map(updates.map((u) => [u.id, u]));

			const optimisticActiveTasks: Task[] = reordered.map((task) => {
				const u = updatedMap.get(task.id)!;
				return {
					...task,
					page_number: u.page_number,
					position: u.position,
					updated_at: now,
				};
			});

			setPrefetchedTasks(new Map());

			// ⚠️ Key difference: go to LAST page, not first
			// const lastPage = getVisibleTotalPages(optimisticActiveTasks);

			await runOptimisticUpdate(
				{
					activeTasks: optimisticActiveTasks,
					completedTasks: displayedCompletedTasks,
					appState: displayedAppState,
					totalPages: getVisibleTotalPages(optimisticActiveTasks),
				},
				async () => {
					// setCurrentPage(lastPage);
					await reorderTasks(updates);
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

	const handleDoneTask = useCallback(async (task: Task) => {
		setAchievementNote("");
		setAchievementPending({ task, sessionMs: 0, type: "done" });
	}, []);

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
					if (deletingWorkingTask) {
						await stopWorkingOnTask();
					}
					await deleteTask(taskId);
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
				status: "active" as TaskStatus,
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
				.map(
					(t, index) =>
						({
							...t,
							page_number: Math.floor(index / DEFAULT_TASK_CAPACITY) + 1,
							position: index % DEFAULT_TASK_CAPACITY,
							updated_at: now,
						}) as Task,
				);

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
						task.tag,
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

	const handleRevertTask = useCallback(
		async (task: Task) => {
			if (!displayedAppState) return;

			const now = new Date().toISOString();

			// Optimistically move task back to active
			const revertedTask: Task = {
				...task,
				status: "active" as TaskStatus,
				completed_at: null,
				updated_at: now,
				// Place at end of active list
				page_number:
					Math.floor(displayedActiveTasks.length / DEFAULT_TASK_CAPACITY) + 1,
				position: displayedActiveTasks.length % DEFAULT_TASK_CAPACITY,
			};

			const optimisticCompletedTasks = displayedCompletedTasks.filter(
				(t) => t.id !== task.id,
			);
			const optimisticActiveTasks = [...displayedActiveTasks, revertedTask];

			setPrefetchedTasks(new Map());

			await runOptimisticUpdate(
				{
					activeTasks: optimisticActiveTasks,
					completedTasks: optimisticCompletedTasks,
					appState: displayedAppState,
					totalPages: getVisibleTotalPages(optimisticActiveTasks),
				},
				async () => {
					await revertTask(task.id);
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

	const handleAddTaskAndStart = useCallback(
		async (text: string, tag?: TagId | null): Promise<Task | null> => {
			const trimmedText = text.trim();
			if (!trimmedText || !displayedAppState) return null;

			const now = new Date().toISOString();
			const newTaskId = crypto.randomUUID();

			const optimisticTask: Task = {
				id: newTaskId,
				text: trimmedText,
				status: "in-progress" as TaskStatus,
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

			const shiftedTasks = displayedActiveTasks.map((task, index) => ({
				...task,
				page_number: Math.floor((index + 1) / DEFAULT_TASK_CAPACITY) + 1,
				position: (index + 1) % DEFAULT_TASK_CAPACITY,
				updated_at: now,
			}));

			const optimisticActiveTasks = [optimisticTask, ...shiftedTasks];

			setPrefetchedTasks(new Map());
			setCurrentPage(1);

			// Set optimistic state with working task immediately — zero flicker
			setOptimisticState({
				activeTasks: optimisticActiveTasks,
				completedTasks: displayedCompletedTasks,
				appState: {
					...displayedAppState,
					working_on_task_id: newTaskId,
					timer_state: "idle",
					current_session_ms: 0,
					session_start_time: null,
					updated_at: now,
				},
				totalPages: getVisibleTotalPages(optimisticActiveTasks),
			});

			try {
				// Create task then immediately start it — two calls but UI already shows result
				const createdTask = await addTask(trimmedText, 1, 0, tag ?? null);
				await startTask(createdTask.id);
				await mutateActive();
				await mutateAppState();
				await mutateTotalPages();
				setOptimisticState(null);
				return createdTask;
			} catch (error) {
				console.error("Failed to add and start task:", error);
				await refreshAll();
				setOptimisticState(null);
				return null;
			}
		},
		[
			displayedActiveTasks,
			displayedAppState,
			displayedCompletedTasks,
			mutateActive,
			mutateAppState,
			mutateTotalPages,
			refreshAll,
		],
	);

	const handleCompleteWorkingTask = useCallback(
		async (task: Task, sessionMs: number) => {
			setAchievementNote("");
			setAchievementPending({ task, sessionMs, type: "complete" });
		},
		[],
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
							status: "active" as TaskStatus,
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

					await updateTask(task.id, { status: "active" as TaskStatus });
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

			// Re-index remaining to close the gap first
			const reindexedRemaining = remainingActiveTasks
				.sort(
					(a, b) => a.page_number - b.page_number || a.position - b.position,
				)
				.map(
					(t, index) =>
						({
							...t,
							page_number: Math.floor(index / DEFAULT_TASK_CAPACITY) + 1,
							position: index % DEFAULT_TASK_CAPACITY,
							updated_at: now,
						}) as Task,
				);

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
				status: "active" as TaskStatus,
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
						task.tag,
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
				// Re-index remaining after removing working task
				const reindexedRemaining = displayedActiveTasks
					.filter((t) => t.id !== workingTask.id)
					.sort(
						(a, b) => a.page_number - b.page_number || a.position - b.position,
					)
					.map(
						(t, index) =>
							({
								...t,
								page_number: Math.floor(index / DEFAULT_TASK_CAPACITY) + 1,
								position: index % DEFAULT_TASK_CAPACITY,
								updated_at: now,
							}) as Task,
					);

				const optimisticActiveTasks = reindexedRemaining.map((t) =>
					t.id === newTask.id
						? { ...t, status: "in-progress" as TaskStatus, updated_at: now }
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
					.map(
						(t, index) =>
							({
								...t,
								page_number: Math.floor(index / DEFAULT_TASK_CAPACITY) + 1,
								position: index % DEFAULT_TASK_CAPACITY,
								updated_at: now,
							}) as Task,
					);

				const placement = getNextTaskPlacement(
					reindexedRemaining,
					DEFAULT_TASK_CAPACITY,
				);

				const reenteredTask: Task = {
					...workingTask,
					id: crypto.randomUUID(),
					page_number: placement.pageNumber,
					position: placement.position,
					status: "active" as TaskStatus,
					total_time_ms: totalTime,
					re_entered_from: workingTask.id,
					added_at: now,
					completed_at: null,
					updated_at: now,
				};

				const optimisticActiveTasks = [
					...reindexedRemaining.map((t) =>
						t.id === newTask.id
							? { ...t, status: "in-progress" as TaskStatus, updated_at: now }
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
							workingTask.tag,
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

	// Handle commit done task
	const commitDoneTask = useCallback(
		async (task: Task, note: string) => {
			if (!displayedAppState) return;
			const now = new Date().toISOString();
			if (note.trim()) await updateTask(task.id, { note: note.trim() });
			const optimisticActiveTasks = displayedActiveTasks
				.filter((t) => t.id !== task.id)
				.sort(
					(a, b) => a.page_number - b.page_number || a.position - b.position,
				)
				.map(
					(t, index) =>
						({
							...t,
							page_number: Math.floor(index / DEFAULT_TASK_CAPACITY) + 1,
							position: index % DEFAULT_TASK_CAPACITY,
							updated_at: now,
						}) as Task,
				);
			const completedTask: Task = {
				...task,
				status: "completed",
				completed_at: now,
				updated_at: now,
				note: note.trim() || task.note,
			};
			setPrefetchedTasks(new Map());
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

	// Handle commit complete working task
	const commitCompleteWorkingTask = useCallback(
		async (task: Task, sessionMs: number, note: string) => {
			if (!displayedAppState) return;

			const now = new Date().toISOString();
			const totalTime = task.total_time_ms + sessionMs;

			const optimisticActiveTasks = displayedActiveTasks
				.filter((t) => t.id !== task.id)
				.sort(
					(a, b) => a.page_number - b.page_number || a.position - b.position,
				)
				.map(
					(t, index) =>
						({
							...t,
							page_number: Math.floor(index / DEFAULT_TASK_CAPACITY) + 1,
							position: index % DEFAULT_TASK_CAPACITY,
							updated_at: now,
						}) as Task,
				);

			const completedTask: Task = {
				...task,
				status: "completed",
				completed_at: now,
				total_time_ms: totalTime,
				updated_at: now,
				note: note.trim() || task.note,
			};

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
					// 👇 ALL async goes here
					if (note.trim()) {
						await updateTask(task.id, { note: note.trim() });
					}

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

	// Handle achievement toast
	const handleAchievementSubmit = useCallback(async () => {
		if (!achievementPending) return;
		const { task, sessionMs, type } = achievementPending;
		setAchievementPending(null);
		if (type === "done") await commitDoneTask(task, achievementNote);
		else await commitCompleteWorkingTask(task, sessionMs, achievementNote);
		setAchievementNote("");
	}, [
		achievementPending,
		achievementNote,
		commitDoneTask,
		commitCompleteWorkingTask,
	]);

	// Handle update completed task tag
	const handleUpdateCompletedTaskTag = useCallback(
		async (taskId: string, tag: TagId | null) => {
			await updateTaskTag(taskId, tag);
			await mutateCompleted(); // Refresh completed tasks
		},
		[mutateCompleted],
	);

	// Handle update completed task note
	const handleUpdateCompletedTaskNote = useCallback(
		async (taskId: string, note: string | null) => {
			await updateTask(taskId, { note });
			await mutateCompleted();
		},
		[mutateCompleted],
	);

	// Handle update completed task text/title
	const handleUpdateCompletedTaskText = useCallback(
		async (taskId: string, text: string) => {
			await updateTask(taskId, { text });
			await mutateCompleted();
		},
		[mutateCompleted],
	);

	//  Add a resetAchievementTimer ref and auto-dismiss logic
	const achievementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const resetAchievementTimer = useCallback(() => {
		if (achievementTimerRef.current) clearTimeout(achievementTimerRef.current);
		achievementTimerRef.current = setTimeout(() => {
			setAchievementPending((pending) => {
				if (!pending) return null;
				// Dismiss without note
				const { task, sessionMs, type } = pending;
				if (type === "done") commitDoneTask(task, "");
				else commitCompleteWorkingTask(task, sessionMs, "");
				return null;
			});
			setAchievementNote("");
		}, 6000);
	}, [commitDoneTask, commitCompleteWorkingTask]);

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
	}, [selectedTags, searchQuery]);

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

	// Start the timer when achievementPending is set
	useEffect(() => {
		if (achievementPending) {
			resetAchievementTimer();
		} else {
			if (achievementTimerRef.current)
				clearTimeout(achievementTimerRef.current);
		}
		return () => {
			if (achievementTimerRef.current)
				clearTimeout(achievementTimerRef.current);
		};
	}, [achievementPending]); // intentionally omit resetAchievementTimer to avoid restart on re-render

	// Rotate achievement toast placeholder text
	useEffect(() => {
		if (achievementPending) {
			setPlaceholderIndex(() =>
				Math.floor(Math.random() * ACHIEVEMENT_PLACEHOLDERS.length),
			);
			placeholderIntervalRef.current = setInterval(() => {
				setPlaceholderIndex((i) => (i + 1) % ACHIEVEMENT_PLACEHOLDERS.length);
			}, 5000);
		} else {
			if (placeholderIntervalRef.current)
				clearInterval(placeholderIntervalRef.current);
		}
		return () => {
			if (placeholderIntervalRef.current)
				clearInterval(placeholderIntervalRef.current);
		};
	}, [achievementPending]);

	const handleToggleTag = useCallback((tagId: TagId | "none" | "all") => {
		setSelectedTags((prev) => {
			if (tagId === "all") {
				return new Set();
			}
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
			if (isSearchOrFilterActive) {
				setFilteredCurrentPage(page);
			} else {
				setCurrentPage(page);
			}
		},
		[isSearchOrFilterActive],
	);

	const taskTagCounts = useMemo(() => {
		const counts: Record<string, number> = { none: 0 };
		for (const tag of TAG_DEFINITIONS) {
			counts[tag.id] = 0;
		}
		for (const task of displayedActiveTasks) {
			if (task.tag) {
				counts[task.tag] = (counts[task.tag] ?? 0) + 1;
			} else {
				counts.none += 1;
			}
		}
		return counts;
	}, [displayedActiveTasks]);

	// Derive achievements from completed tasks
	const { data: achievementTasks = [], mutate: mutateAchievements } = useSWR<
		Task[]
	>("achievement-tasks", getTasksWithNotes, { refreshInterval: 0 });
	const completedTasksWithNotes = useMemo(
		() =>
			achievementTasks.map((t) => ({
				text: t.text,
				note: t.note!,
				completed_at: t.completed_at!,
			})),
		[achievementTasks],
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
				onAddTask={handleAddTask}
				onAddTaskAndStart={handleAddTaskAndStart}
				onStartTask={handleStartTask}
				activeTasks={displayedActiveTasks}
			/>

			<ViewTabs
				activeView={activeView}
				onViewChange={setActiveView}
				selectedTags={selectedTags}
				onToggleTag={handleToggleTag}
				onAddTasks={handleAddTasks}
				completedSort={completedSort}
				onCompletedSortChange={setCompletedSort}
				completedViewType={completedViewType}
				onCompletedViewTypeChange={setCompletedViewType}
			/>

			{activeView === "tasks" && (
				<PageNav
					currentPage={effectiveCurrentPage}
					totalPages={effectiveTotalPages}
					onPageChange={handlePageChange}
					isFiltered={isSearchOrFilterActive}
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					totalActiveTasks={displayedActiveTasks.length}
					taskTagCounts={taskTagCounts}
					completedTasksWithNotes={completedTasksWithNotes}
					onRefreshAchievements={mutateAchievements}
				/>
			)}

			{activeView === "tasks" && (
				<ContentFilterBar value={contentFilter} onChange={setContentFilter} />
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
						onPumpTask={handlePumpTask}
						onSinkTask={handleSinkTask}
						visibleTotalPages={getVisibleTotalPages(displayedActiveTasks)}
					/>
				) : (
					<CompletedList
						tasks={displayedCompletedTasks}
						selectedTags={selectedTags}
						completedSort={completedSort}
						completedViewType={completedViewType}
						hasMore={hasMoreCompleted}
						isLoadingMore={isLoadingMore}
						onLoadMore={handleLoadMoreCompleted}
						onRefresh={refreshAll}
						onDeleteTask={handleDeleteTask}
						onRevertTask={handleRevertTask}
						onUpdateTaskTag={handleUpdateCompletedTaskTag}
						onUpdateTaskNote={handleUpdateCompletedTaskNote}
						onUpdateTaskText={handleUpdateCompletedTaskText}
					/>
				)}
			</main>

			{activeView === "tasks" && (
				<>
					<TaskInput onAddTask={handleAddTask} selectedTags={selectedTags} />
				</>
			)}

			<AnimatePresence>
				{achievementPending && (
					<>
						<motion.div
							key="achievement-backdrop"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
							onClick={() => {
								const { task, sessionMs, type } = achievementPending;
								setAchievementPending(null);
								if (type === "done") commitDoneTask(task, "");
								else commitCompleteWorkingTask(task, sessionMs, "");
								setAchievementNote("");
							}}
						/>
						<div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4">
							<motion.div
								key="achievement-toast"
								initial={{ opacity: 0, scale: 0.92, y: 16 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.92, y: 16 }}
								transition={{ type: "spring", stiffness: 400, damping: 28 }}
								className="bg-card border border-border rounded-xl shadow-lg p-4 flex flex-col gap-3 w-full max-w-sm pointer-events-auto"
								onClick={(e) => e.stopPropagation()}
							>
								<div className="text-sm uppercase font-medium text-foreground mb-1.5">
									{ACHIEVEMENT_PLACEHOLDERS[placeholderIndex]}
								</div>

								{/* <div className="text-xs text-muted-foreground truncate">
									{achievementPending.task.text}
								</div> */}
								<input
									autoFocus
									type="text"
									value={achievementNote}
									onChange={(e) => {
										setAchievementNote(e.target.value);
										resetAchievementTimer();
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter") handleAchievementSubmit();
										if (e.key === "Escape") {
											const { task, sessionMs, type } = achievementPending;
											setAchievementPending(null);
											if (type === "done") commitDoneTask(task, "");
											else commitCompleteWorkingTask(task, sessionMs, "");
											setAchievementNote("");
										}
									}}
									placeholder="e.g. Finished a 10km run for the first time"
									className="w-full bg-background border border-input rounded-lg px-3 py-2 mb-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
								/>
								<div className="flex gap-2 justify-end w-full">
									<button
										onClick={() => {
											const { task, sessionMs, type } = achievementPending;
											setAchievementPending(null);
											if (type === "done") commitDoneTask(task, "");
											else commitCompleteWorkingTask(task, sessionMs, "");
											setAchievementNote("");
										}}
										className="w-1/2 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 border border-muted-foreground rounded-lg hover:bg-muted transition-colors"
									>
										Skip
									</button>
									<button
										onClick={handleAchievementSubmit}
										className="w-1/2 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
									>
										Save
									</button>
								</div>
							</motion.div>
						</div>
					</>
				)}
			</AnimatePresence>
		</div>
	);
}
