"use client";

import { useState, useEffect, useCallback } from "react";
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
	completeTask,
	deleteTask,
	getActiveTasks,
	getAppState,
	getCompletedTasks,
	getTotalPageCount,
	markTaskDone,
	pauseTimer,
	reorderTasks,
	resumeTimer,
	startTask,
	stopTimer,
	stopWorkingOnTask,
	updateTask,
} from "@/lib/store";
import type { Task, AppState } from "@/lib/types";

const PAGE_SIZE = 30;

interface OptimisticStateSnapshot {
	activeTasks: Task[];
	completedTasks: Task[];
	appState: AppState;
	totalPages: number;
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
		["total-pages", PAGE_SIZE],
		() => getTotalPageCount(PAGE_SIZE),
		{ refreshInterval: 0 },
	);

	const displayedActiveTasks = optimisticState?.activeTasks ?? activeTasks;
	const displayedCompletedTasks =
		optimisticState?.completedTasks ?? completedTasks;
	const displayedAppState = optimisticState?.appState ?? appState;
	const displayedTotalPages = optimisticState?.totalPages ?? totalPages;

	// Get tasks for current page
	const tasksForCurrentPage = displayedActiveTasks
		.filter((task) => task.page_number === currentPage)
		.sort((a, b) => a.position - b.position);

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

			const optimisticActiveTasks = displayedActiveTasks.filter(
				(task) => task.id !== taskId,
			);
			const optimisticCompletedTasks = displayedCompletedTasks.filter(
				(task) => task.id !== taskId,
			);
			const deletingWorkingTask =
				displayedAppState.working_on_task_id === taskId;
			const now = new Date().toISOString();

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

	if (!displayedAppState) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-muted-foreground">Loading...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col">
			<Header />

			<TimerBar
				appState={displayedAppState}
				workingTask={workingTask}
				onRefresh={refreshAll}
				onStartTimer={handleRunTimer}
				onPauseTimer={handlePauseTimer}
				onResumeTimer={handleRunTimer}
				onStopTimer={handleStopTimer}
				onCompleteTask={handleCompleteWorkingTask}
				onCancelTask={handleCancelWorkingTask}
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
						pageSize={PAGE_SIZE}
						onStartTask={handleStartTask}
						onDoneTask={handleDoneTask}
						onDeleteTask={handleDeleteTask}
						onReorderTasks={handleReorderTasks}
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
					<TaskInput pageSize={PAGE_SIZE} onTaskAdded={refreshAll} />
					<BacklogDump pageSize={PAGE_SIZE} onTasksAdded={refreshAll} />
				</>
			)}

			<AboutSection />
		</div>
	);
}
