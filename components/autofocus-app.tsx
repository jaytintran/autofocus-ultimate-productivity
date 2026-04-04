"use client";

// =============================================================================
// IMPORTS
// =============================================================================

import { useUserId } from "@/hooks/use-user-id";

// React & Core
import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// Third-party
import { AnimatePresence, motion } from "framer-motion";
import useSWR from "swr";

// Components
import { Header } from "./header";
import { TimerBar } from "./timer-bar";
import { ViewTabs } from "./view-tabs";
import { PageNav } from "./page-nav";
import { TaskList } from "./task-list";
import { CompletedList } from "./completed-list";
import { TaskInput } from "./task-input";
import { PamphletSwitcher } from "./pamphlet-switcher";

// Store & Types
import {
	addMultipleTasks,
	addTask,
	addLoggedActivity,
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
	revertTask,
	createAndCompleteTask,
} from "@/lib/store";
import { moveTaskToPamphlet } from "@/lib/store";

import type {
	Task,
	AppState,
	TaskStatus,
	OptimisticStateSnapshot,
	PagedTaskLike,
	TaskPlacement,
	TaskReorderUpdate,
} from "@/lib/types";
import { type CompletedSortKey, type CompletedViewType } from "./view-tabs";
import { TAG_DEFINITIONS, TagId } from "@/lib/tags";
import {
	applyContentFilter,
	type ContentFilterState,
} from "@/lib/content-filter";

// Utilities & Hooks
import {
	calculateNextTaskPlacement,
	calculateShiftedPositions,
	calculateReindexedPositions,
	getVisibleTotalPages,
	getApproximateTaskCapacity,
} from "@/lib/utils/task-utils";
import {
	getCurrentSessionMs,
	formatTimerDisplay,
	formatTimeCompact,
	getTaskAge,
} from "@/lib/utils/time-utils";
import { invalidatePamphletCache } from "@/lib/pamphlet-cache";

import { usePamphlets } from "@/hooks/use-pamphlets";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useHabits } from "@/hooks/use-habits";
import { HabitGrid } from "./habit-grid";
import { createClient } from "@/lib/supabase/client";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_TASK_CAPACITY = 12;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getNextTaskPlacement(
	tasks: PagedTaskLike[],
	pageCapacity: number,
): TaskPlacement {
	return calculateNextTaskPlacement(tasks, pageCapacity);
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

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AutofocusApp() {
	// -------------------------------------------------------------------------
	// State - User
	// -------------------------------------------------------------------------
	const userId = useUserId();

	// -------------------------------------------------------------------------
	// State - View & Filter
	// -------------------------------------------------------------------------
	const {
		pamphlets,
		activePamphlet,
		activePamphletId,
		activeTasks: pamphletActiveTasks,
		isLoadingTasks,
		switchPamphlet,
		invalidateAndRefetch,
		addPamphlet,
		renamePamphlet,
		removePamphlet,
		fetchCompletedTasks,
		fetchTotalPages,
		reorderPamphletsList,
	} = usePamphlets();

	const [activeView, setActiveView] = useState<"tasks" | "completed">("tasks");
	const [habitsViewActive, setHabitsViewActive] = useState(false);
	const {
		habits,
		handleToggleToday: handleToggleHabit,
		handleReorder,
	} = useHabits();

	const [selectedTags, setSelectedTags] = useState<Set<TagId | "none">>(
		new Set(),
	);
	const [contentFilter, setContentFilter] = useState<ContentFilterState>({
		options: [],
		preset: "show-all",
	});
	const [searchQuery, setSearchQuery] = useState("");
	const debouncedSearchQuery = useDebouncedValue(searchQuery, 2500);

	// -------------------------------------------------------------------------
	// State - Pagination
	// -------------------------------------------------------------------------
	const [currentPage, setCurrentPage] = useState(1);
	const [filteredCurrentPage, setFilteredCurrentPage] = useState(1);

	// -------------------------------------------------------------------------
	// State - Completed Tasks
	// -------------------------------------------------------------------------
	const [completedPage, setCompletedPage] = useState(1);
	const completedPageRef = useRef(1);

	const [allCompletedTasks, setAllCompletedTasks] = useState<Task[]>([]);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [hasMoreCompleted, setHasMoreCompleted] = useState(true);
	const [completedSort, setCompletedSort] =
		useState<CompletedSortKey>("default");
	const [completedViewType, setCompletedViewType] =
		useState<CompletedViewType>("bullet");
	// -------------------------------------------------------------------------
	// State - UI & Optimistic Updates
	// -------------------------------------------------------------------------
	const [optimisticState, setOptimisticState] =
		useState<OptimisticStateSnapshot | null>(null);
	const [visibleTaskCapacity, setVisibleTaskCapacity] = useState(
		DEFAULT_TASK_CAPACITY,
	);
	const [prefetchedTasks, setPrefetchedTasks] = useState<Map<number, Task[]>>(
		new Map(),
	);
	const [hasInitializedFilter, setHasInitializedFilter] = useState(false);

	// -------------------------------------------------------------------------
	// Data Fetching
	// -------------------------------------------------------------------------
	const [activeTasks, setActiveTasks] = useState<Task[]>(pamphletActiveTasks);

	useEffect(() => {
		setActiveTasks(pamphletActiveTasks);
	}, [pamphletActiveTasks]);

	const mutateActive = useCallback(async () => {
		await invalidateAndRefetch();
	}, [invalidateAndRefetch]);

	const mutateCompleted = useCallback(async () => {
		if (!activePamphletId) return;
		const pagesToFetch = Array.from(
			{ length: completedPageRef.current },
			(_, i) => i + 1,
		);
		const results = await Promise.all(
			pagesToFetch.map((p) => fetchCompletedTasks(activePamphletId, p)),
		);
		const merged = results.flat();
		setAllCompletedTasks(merged);
		setHasMoreCompleted(results[results.length - 1].length === 50);
	}, [activePamphletId, fetchCompletedTasks]);

	// Initial load when pamphlet changes
	useEffect(() => {
		mutateCompleted();
	}, [activePamphletId, mutateCompleted]);

	const { data: appState, mutate: mutateAppState } = useSWR<AppState>(
		userId ? `app-state-${userId}` : null,
		getAppState,
		{ refreshInterval: 1000 },
	);

	const [totalPages, setTotalPages] = useState(1);

	useEffect(() => {
		if (!activePamphletId) return;
		fetchTotalPages(activePamphletId).then(setTotalPages);
	}, [activePamphletId, activeTasks, fetchTotalPages]);

	const mutateTotalPages = useCallback(async () => {
		if (!activePamphletId) return;
		const pages = await fetchTotalPages(activePamphletId);
		setTotalPages(pages);
	}, [activePamphletId, fetchTotalPages]);

	const { data: achievementTasks = [], mutate: mutateAchievements } = useSWR<
		Task[]
	>(userId ? `achievement-tasks-${userId}` : null, getTasksWithNotes, {
		refreshInterval: 0,
	});

	// -------------------------------------------------------------------------
	// Derived State
	// -------------------------------------------------------------------------
	const displayedActiveTasks = optimisticState?.activeTasks ?? activeTasks;
	const displayedCompletedTasks =
		optimisticState?.completedTasks ?? allCompletedTasks;
	const displayedAppState = optimisticState?.appState ?? appState;
	const displayedTotalPages = optimisticState?.totalPages ?? totalPages;

	const isFilterActive = selectedTags.size > 0;
	const isSearchOrFilterActive =
		isFilterActive || !!debouncedSearchQuery.trim();

	const activeHabitCount = useMemo(
		() => habits.filter((h) => h.status === "active").length,
		[habits],
	);

	const { data: allActiveTasks = [], mutate: mutateAllActive } = useSWR<Task[]>(
		userId ? `all-active-tasks-${userId}` : null,
		getActiveTasks,
		{ refreshInterval: 0 },
	);

	const workingTask = useMemo(() => {
		if (!displayedAppState?.working_on_task_id) return null;
		const id = displayedAppState.working_on_task_id;

		// Check optimistic state first — this is what makes it instant
		const optimisticMatch =
			optimisticState?.activeTasks.find((t) => t.id === id) ?? null;
		if (optimisticMatch) return optimisticMatch;

		// Check current pamphlet tasks first (already cached, faster)
		const pamphletMatch = displayedActiveTasks.find((t) => t.id === id) ?? null;
		if (pamphletMatch) return pamphletMatch;

		// Fall back to cross-pamphlet real data
		return allActiveTasks.find((t) => t.id === id) ?? null;
	}, [
		optimisticState,
		displayedActiveTasks,
		allActiveTasks,
		displayedAppState?.working_on_task_id,
	]);

	// -------------------------------------------------------------------------
	// Filtered Tasks Computation
	// -------------------------------------------------------------------------
	const finalFilteredTasks = useMemo(() => {
		let tasks = displayedActiveTasks;

		// 1. Tag filter
		if (selectedTags.size > 0) {
			tasks = tasks.filter((task) => {
				if (selectedTags.has("none")) return task.tag === null;
				return task.tag && selectedTags.has(task.tag);
			});
		}

		// 2. Search filter
		if (debouncedSearchQuery.trim()) {
			const q = debouncedSearchQuery.toLowerCase();
			tasks = tasks.filter((task) => task.text.toLowerCase().includes(q));
		}

		// 3. Content filter
		tasks = applyContentFilter(tasks, contentFilter);

		return tasks;
	}, [displayedActiveTasks, selectedTags, debouncedSearchQuery, contentFilter]);

	const effectiveTotalPages = useMemo(
		() =>
			Math.max(1, Math.ceil(finalFilteredTasks.length / DEFAULT_TASK_CAPACITY)),
		[finalFilteredTasks.length],
	);

	const effectiveCurrentPage = currentPage;

	const tasksForCurrentPage = useMemo(() => {
		const start = (effectiveCurrentPage - 1) * DEFAULT_TASK_CAPACITY;
		const end = start + DEFAULT_TASK_CAPACITY;
		return finalFilteredTasks.slice(start, end);
	}, [finalFilteredTasks, effectiveCurrentPage]);

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

	const completedTasksWithNotes = useMemo(
		() =>
			(Array.isArray(achievementTasks) ? achievementTasks : []).map((t) => ({
				text: t.text,
				note: t.note!,
				completed_at: t.completed_at!,
				pamphlet_id: t.pamphlet_id,
			})),
		[achievementTasks],
	);

	// Add filtered completed tasks computation
	const filteredCompletedTasks = useMemo(() => {
		return applyContentFilter(displayedCompletedTasks, contentFilter);
	}, [displayedCompletedTasks, contentFilter]);

	// -------------------------------------------------------------------------
	// Effects
	// -------------------------------------------------------------------------

	// Initialize filter from default preference
	useEffect(() => {
		if (appState && !hasInitializedFilter) {
			if (appState.default_filter === "none") {
				setSelectedTags(new Set(["none"]));
			}
			setHasInitializedFilter(true);
		}
	}, [appState, hasInitializedFilter]);

	// Pre-fetch adjacent pages
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

	// Auto-navigate to working task's page
	const prevWorkingTaskIdRef = useRef<string | null>(null);
	useEffect(() => {
		const currentWorkingId = displayedAppState?.working_on_task_id ?? null;
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

	// Reset pages when filters change
	useEffect(() => {
		setFilteredCurrentPage(1);
	}, [selectedTags, searchQuery, contentFilter]);

	useEffect(() => {
		setCurrentPage(1);
	}, [selectedTags, debouncedSearchQuery, contentFilter]);

	// Reset pages when pamphlet changes
	useEffect(() => {
		setCurrentPage(1);
		setFilteredCurrentPage(1);
		setAllCompletedTasks([]);
		setCompletedPage(1);
		completedPageRef.current = 1;
		setHasMoreCompleted(true);
	}, [activePamphletId]);

	// Ensure filtered current page is valid
	useEffect(() => {
		if (
			isFilterActive &&
			filteredCurrentPage > effectiveTotalPages &&
			effectiveTotalPages > 0
		) {
			setFilteredCurrentPage(effectiveTotalPages);
		}
	}, [isFilterActive, filteredCurrentPage, effectiveTotalPages]);

	// -------------------------------------------------------------------------
	// Callbacks - Data Refresh
	// -------------------------------------------------------------------------
	const refreshAll = useCallback(async () => {
		await Promise.all([
			mutateActive(),
			mutateAllActive(),
			mutateCompleted(),
			mutateAppState(),
			mutateTotalPages(),
		]);
	}, [
		mutateActive,
		mutateAllActive,
		mutateCompleted,
		mutateAppState,
		mutateTotalPages,
	]);

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

	// -------------------------------------------------------------------------
	// Callbacks - Task Operations
	// -------------------------------------------------------------------------
	const handleAddTask = useCallback(
		async (
			text: string,
			tag?: TagId | null,
			dueDate?: string | null,
			trackerId?: string | null,
		) => {
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
				due_date: dueDate ?? null,
				pamphlet_id: activePamphletId,
				tracker_id: trackerId ?? null,
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
			setOptimisticState({
				activeTasks: optimisticActiveTasks,
				completedTasks: displayedCompletedTasks,
				appState: displayedAppState,
				totalPages: getVisibleTotalPages(optimisticActiveTasks),
			});

			try {
				const createdTask = await addTask(
					trimmedText,
					1,
					0,
					tag ?? null,
					dueDate ?? null,
					activePamphletId,
				);
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
				due_date: null,
				pamphlet_id: activePamphletId,
				tracker_id: null,
			}));

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
				pamphletId: activePamphletId,
			}));

			setPrefetchedTasks(new Map());
			setCurrentPage(1);
			setOptimisticState({
				activeTasks: optimisticActiveTasks,
				completedTasks: displayedCompletedTasks,
				appState: displayedAppState,
				totalPages: getVisibleTotalPages(optimisticActiveTasks),
			});

			addMultipleTasks(tasksToAdd)
				.then(async () => {
					await mutateActive();
					await mutateTotalPages();
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
					await markTaskDone(task.id, task.total_time_ms, activePamphletId);
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

	// -------------------------------------------------------------------------
	// Callbacks - Task Actions
	// -------------------------------------------------------------------------
	const handleMoveTask = useCallback(
		async (taskId: string, toPamphletId: string) => {
			await moveTaskToPamphlet(taskId, toPamphletId);
			await mutateActive();
			// Also invalidate destination pamphlet cache
			invalidatePamphletCache(toPamphletId);
		},
		[mutateActive],
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

	const handleDoneTask = useCallback(
		async (task: Task) => {
			await commitDoneTask(task, "");
		},
		[commitDoneTask],
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
					await deleteTask(taskId, activePamphletId);
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

			const reindexedPlacement = getNextTaskPlacement(
				reindexedRemaining,
				DEFAULT_TASK_CAPACITY,
			);

			const reenteredTaskFinal: Task = {
				...task,
				id: crypto.randomUUID(),
				page_number: reindexedPlacement.pageNumber,
				position: reindexedPlacement.position,
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
						activePamphletId,
					);
					await markTaskDone(task.id, task.total_time_ms, activePamphletId);
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

			const revertedTask: Task = {
				...task,
				status: "active" as TaskStatus,
				completed_at: null,
				updated_at: now,
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
					await revertTask(task.id, activePamphletId);
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

	const handleUpdateWorkingTaskDueDate = useCallback(
		async (taskId: string, dueDate: string | null) => {
			await updateTask(taskId, { due_date: dueDate });
			await mutateAllActive();
		},
		[mutateAllActive],
	);

	const handleUpdateWorkingTaskTag = useCallback(
		async (taskId: string, tag: TagId | null) => {
			await updateTaskTag(taskId, tag);
			await mutateAllActive();
		},
		[mutateAllActive],
	);

	const handleCompleteAdjacentTask = useCallback(
		async (taskId: string | null, text: string) => {
			if (taskId) {
				// Existing task — mark it done directly
				await markTaskDone(taskId, 0, activePamphletId);
			} else {
				// New task — create and immediately complete
				await createAndCompleteTask(text, activePamphletId, null);
			}
			await mutateCompleted();
			await mutateActive();
		},
		[activePamphletId, mutateCompleted, mutateActive],
	);

	const handleUpdateTaskDueDate = useCallback(
		async (taskId: string, dueDate: string | null) => {
			await updateTask(taskId, { due_date: dueDate });
			await mutateActive();
		},
		[mutateActive],
	);

	// -------------------------------------------------------------------------
	// Callbacks - Timer Operations
	// -------------------------------------------------------------------------
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

	// -------------------------------------------------------------------------
	// Callbacks - Combined Operations
	// -------------------------------------------------------------------------
	const handleAddTaskAndStart = useCallback(
		async (
			text: string,
			tag?: TagId | null,
			dueDate?: string | null,
		): Promise<Task | null> => {
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
				due_date: dueDate ?? null,
				pamphlet_id: activePamphletId,
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
				const createdTask = await addTask(
					trimmedText,
					1,
					0,
					tag ?? null,
					dueDate ?? null,
					activePamphletId,
				);
				await startTask(createdTask.id);
				await Promise.all([
					mutateActive(),
					mutateAllActive(),
					mutateAppState(),
					mutateTotalPages(),
				]);
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
			mutateAllActive,
			mutateAppState,
			mutateTotalPages,
			refreshAll,
		],
	);

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

	const handleCompleteWorkingTask = useCallback(
		async (task: Task, sessionMs: number, note: string) => {
			await commitCompleteWorkingTask(task, sessionMs, note);
		},
		[commitCompleteWorkingTask],
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
		async (task: Task, note?: string) => {
			if (!displayedAppState) return;

			const now = new Date().toISOString();
			const remainingActiveTasks = displayedActiveTasks.filter(
				(activeTask) => activeTask.id !== task.id,
			);

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
					if (note?.trim()) {
						await updateTask(task.id, { note: note.trim() });
					}
					await reenterTask(
						task.id,
						task.text,
						placement.pageNumber,
						placement.position,
						task.total_time_ms,
						task.tag,
						activePamphletId,
					);
					await markTaskDone(task.id, task.total_time_ms, activePamphletId);
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

			if (action === "complete") {
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
						await markTaskDone(workingTask.id, totalTime, activePamphletId);
						await startTask(newTask.id);
					},
				);
			} else {
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
							activePamphletId,
						);
						await markTaskDone(workingTask.id, totalTime, activePamphletId);
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

	// -------------------------------------------------------------------------
	// Callbacks - Completed Tasks
	// -------------------------------------------------------------------------
	const handleLoadMoreCompleted = useCallback(async () => {
		if (isLoadingMore || !hasMoreCompleted || !activePamphletId) return;
		setIsLoadingMore(true);
		try {
			const nextPage = completedPageRef.current + 1;
			const moreTasks = await fetchCompletedTasks(activePamphletId, nextPage);
			setAllCompletedTasks((prev) => [...prev, ...moreTasks]);
			completedPageRef.current = nextPage;
			setCompletedPage(nextPage);
			setHasMoreCompleted(moreTasks.length === 50);
		} finally {
			setIsLoadingMore(false);
		}
	}, [isLoadingMore, hasMoreCompleted, activePamphletId, fetchCompletedTasks]);

	// -------------------------------------------------------------------------
	// Callbacks - Task Updates
	// -------------------------------------------------------------------------
	const handleUpdateTaskText = useCallback(
		async (taskId: string, text: string, isCompleted: boolean) => {
			if (!displayedAppState) return;

			const now = new Date().toISOString();

			const optimisticActiveTasks = displayedActiveTasks.map((task) =>
				task.id === taskId ? { ...task, text, updated_at: now } : task,
			);

			const optimisticCompletedTasks = displayedCompletedTasks.map((task) =>
				task.id === taskId ? { ...task, text, updated_at: now } : task,
			);

			await runOptimisticUpdate(
				{
					activeTasks: optimisticActiveTasks,
					completedTasks: optimisticCompletedTasks,
					appState: displayedAppState,
					totalPages: displayedTotalPages,
				},
				async () => {
					await updateTask(taskId, { text });
				},
			);
		},
		[
			displayedActiveTasks,
			displayedCompletedTasks,
			displayedAppState,
			displayedTotalPages,
			runOptimisticUpdate,
		],
	);

	const handleUpdateCompletedTaskTag = useCallback(
		async (taskId: string, tag: TagId | null) => {
			await updateTaskTag(taskId, tag);
			await mutateCompleted();
		},
		[mutateCompleted],
	);

	const handleUpdateCompletedTaskNote = useCallback(
		async (taskId: string, note: string | null) => {
			await updateTask(taskId, { note });
			await mutateCompleted();
		},
		[mutateCompleted],
	);

	const handleUpdateCompletedTaskText = useCallback(
		async (taskId: string, text: string) => {
			await handleUpdateTaskText(taskId, text, true);
		},
		[handleUpdateTaskText],
	);

	const handleAddLoggedActivity = useCallback(
		async (
			text: string,
			tag?: TagId | null,
			note?: string | null,
			completedAt?: string | null,
			source?: "log" | "task",
		) => {
			const task = await addLoggedActivity(
				text,
				tag,
				note,
				completedAt,
				activePamphletId,
				source,
			);
			await mutateCompleted();
			return task;
		},
		[activePamphletId, mutateCompleted],
	);

	// -------------------------------------------------------------------------
	// Callbacks - UI Actions
	// -------------------------------------------------------------------------
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

	const handleVisibleTaskCapacityChange = useCallback((capacity: number) => {
		setVisibleTaskCapacity((currentCapacity) =>
			currentCapacity === capacity ? currentCapacity : capacity,
		);
	}, []);

	// -------------------------------------------------------------------------
	// Render
	// -------------------------------------------------------------------------
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

			<PamphletSwitcher
				pamphlets={pamphlets}
				activePamphlet={activePamphlet}
				onSwitch={switchPamphlet}
				onAdd={addPamphlet}
				onRename={renamePamphlet}
				onRemove={removePamphlet}
				onReorder={reorderPamphletsList}
			/>

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
				pamphlets={pamphlets}
				onUpdateDueDate={handleUpdateWorkingTaskDueDate}
				onUpdateTaskTag={handleUpdateWorkingTaskTag}
				onCompleteAdjacentTask={handleCompleteAdjacentTask}
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
				contentFilter={contentFilter}
				onChangeContentFilter={setContentFilter}
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
					pamphlets={pamphlets}
					habitsViewActive={habitsViewActive}
					onToggleHabitsView={() => setHabitsViewActive((v) => !v)}
					activeHabitCount={activeHabitCount}
				/>
			)}

			<main className="flex-1 flex flex-col min-h-0 pb-24">
				{activeView === "tasks" &&
					(habitsViewActive ? (
						<div className="flex-1 overflow-y-auto min-h-0">
							<HabitGrid
								habits={habits}
								onToggle={handleToggleHabit}
								onReorder={handleReorder}
							/>
						</div>
					) : (
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
							disableSwipeForWorkingTask={true}
							pamphlets={pamphlets}
							activePamphletId={activePamphletId}
							onMoveTask={handleMoveTask}
							onUpdateDueDate={handleUpdateTaskDueDate}
						/>
					))}
				{activeView === "completed" && (
					<CompletedList
						tasks={filteredCompletedTasks}
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
						onAddLoggedActivity={handleAddLoggedActivity}
						pamphlets={pamphlets}
						activePamphletId={activePamphletId}
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
