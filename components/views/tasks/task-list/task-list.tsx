"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { Task } from "@/lib/types";
import { updateTask } from "@/lib/db/store-v1";
import {
	DndContext,
	closestCenter,
	PointerSensor,
	TouchSensor,
	useSensor,
	useSensors,
	DragEndEvent,
	DragStartEvent,
	DragOverlay,
} from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { updateTaskTag } from "@/lib/db/store-v1";
import type { TagId } from "@/lib/tags";
import { TaskRow } from "./task-row";
import { playCompletionSound } from "./play-completion-sound";
import type { TaskListProps } from "./task-list-types";

/**
 * Virtualized task list with drag-drop reordering, filtering, and optimistic UI.
 * Optimized to minimize re-renders: TaskRow is memoized, callbacks are stable,
 * and loading states are tracked per-task without triggering parent re-renders.
 */
export function TaskList({
	tasks,
	allTasks,
	workingTaskId,
	selectedTags,
	onRefresh,
	onStartTask,
	onDoneTask,
	onDeleteTask,
	onReenterTask,
	onReorderTasks,
	onSwitchTask,
	onVisibleCapacityChange,
	onPumpTask,
	onSinkTask,
	visibleTotalPages,
	disableSwipeForWorkingTask = false,
	pamphlets,
	activePamphletId,
	onMoveTask,
	onUpdateDueDate,
	onUpdateText,
}: TaskListProps) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLUListElement>(null);
	const [loadingTaskIds, setLoadingTaskIds] = useState<Set<string>>(new Set());

	// Stable loading state helpers
	const addLoading = useCallback((id: string) => {
		setLoadingTaskIds((prev) => {
			if (prev.has(id)) return prev;
			const next = new Set(prev);
			next.add(id);
			return next;
		});
	}, []);

	const removeLoading = useCallback((id: string) => {
		setLoadingTaskIds((prev) => {
			if (!prev.has(id)) return prev;
			const next = new Set(prev);
			next.delete(id);
			return next;
		});
	}, []);

	// DnD sensors with reduced delay for snappier feel
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 5 },
		}),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 100, tolerance: 5 },
		}),
	);

	// Memoized filtered tasks
	const filteredTasks = useMemo(() => {
		if (selectedTags.size === 0) return tasks;

		return tasks.filter((task) => {
			if (selectedTags.has("none")) {
				return task.tag === null;
			}
			return task.tag && selectedTags.has(task.tag);
		});
	}, [tasks, selectedTags]);

	// Stable callback creators
	const handleUpdateTag = useCallback(
		async (taskId: string, tag: TagId | null) => {
			if (loadingTaskIds.has(taskId)) return;
			addLoading(taskId);
			try {
				await updateTaskTag(taskId, tag);
				await onRefresh();
			} finally {
				removeLoading(taskId);
			}
		},
		[loadingTaskIds, addLoading, removeLoading, onRefresh],
	);

	const handlePumpTask = useCallback(
		async (taskId: string) => {
			if (loadingTaskIds.has(taskId)) return;
			addLoading(taskId);
			try {
				await onPumpTask(taskId);
			} finally {
				removeLoading(taskId);
			}
		},
		[loadingTaskIds, addLoading, removeLoading, onPumpTask],
	);

	const handleSinkTask = useCallback(
		async (taskId: string) => {
			if (loadingTaskIds.has(taskId)) return;
			addLoading(taskId);
			try {
				await onSinkTask(taskId);
			} finally {
				removeLoading(taskId);
			}
		},
		[loadingTaskIds, addLoading, removeLoading, onSinkTask],
	);

	const handleDragStart = useCallback((event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	}, []);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event;
			setActiveId(null);

			if (!over || active.id === over.id) return;

			try {
				await onReorderTasks(active.id as string, over.id as string);
			} catch (error) {
				console.error("Failed to reorder tasks:", error);
			}
		},
		[onReorderTasks],
	);

	const handleUpdateDueDate = useCallback(
		async (taskId: string, dueDate: string | null) => {
			try {
				await onUpdateDueDate(taskId, dueDate);
			} catch (error) {
				console.error("Failed to update due date:", error);
				onRefresh();
			}
		},
		[onUpdateDueDate, onRefresh],
	);

	// Memoized derived values
	const activeTask = useMemo(
		() => (activeId ? allTasks.find((t) => t.id === activeId) : null),
		[activeId, allTasks],
	);

	const workingTask = useMemo(
		() =>
			workingTaskId
				? (allTasks.find((t) => t.id === workingTaskId) ?? null)
				: null,
		[workingTaskId, allTasks],
	);

	// Visible capacity calculation for parent pagination
	useEffect(() => {
		if (!onVisibleCapacityChange) return;

		const calculateVisibleCapacity = () => {
			const container = containerRef.current;
			if (!container) return;

			const firstTaskRow =
				listRef.current?.querySelector<HTMLLIElement>("li[data-task-id]");
			const rowHeight = firstTaskRow?.getBoundingClientRect().height || 48;
			const capacity = Math.max(
				1,
				Math.floor(container.clientHeight / Math.max(rowHeight, 1)),
			);

			onVisibleCapacityChange(capacity);
		};

		calculateVisibleCapacity();

		if (typeof ResizeObserver === "undefined") return;

		const observer = new ResizeObserver(calculateVisibleCapacity);
		if (containerRef.current) observer.observe(containerRef.current);
		const firstTaskRow = listRef.current?.querySelector("li[data-task-id]");
		if (firstTaskRow) observer.observe(firstTaskRow);

		return () => observer.disconnect();
	}, [tasks, onVisibleCapacityChange]);

	// Stable action handlers
	const handleStart = useCallback(
		async (task: Task) => {
			if (loadingTaskIds.has(task.id)) return;
			addLoading(task.id);
			try {
				await onStartTask(task);
			} finally {
				removeLoading(task.id);
			}
		},
		[loadingTaskIds, addLoading, removeLoading, onStartTask],
	);

	const handleDone = useCallback(
		async (task: Task) => {
			if (loadingTaskIds.has(task.id)) return;
			addLoading(task.id);
			playCompletionSound();
			try {
				await onDoneTask(task);
			} finally {
				removeLoading(task.id);
			}
		},
		[loadingTaskIds, addLoading, removeLoading, onDoneTask],
	);

	const handleReenter = useCallback(
		async (task: Task) => {
			if (loadingTaskIds.has(task.id)) return;
			addLoading(task.id);
			try {
				await onReenterTask(task);
			} finally {
				removeLoading(task.id);
			}
		},
		[loadingTaskIds, addLoading, removeLoading, onReenterTask],
	);

	const handleDelete = useCallback(
		async (taskId: string) => {
			if (loadingTaskIds.has(taskId)) return;
			addLoading(taskId);
			try {
				await onDeleteTask(taskId);
			} finally {
				removeLoading(taskId);
			}
		},
		[loadingTaskIds, addLoading, removeLoading, onDeleteTask],
	);

	const handleUpdateText = useCallback(
		async (taskId: string, newText: string, dueDate?: string | null) => {
			if (onUpdateText) {
				await onUpdateText(taskId, newText);
				if (dueDate !== undefined) {
					await onUpdateDueDate(taskId, dueDate);
				}
			} else {
				try {
					await updateTask(taskId, {
						text: newText,
						...(dueDate !== undefined && { due_date: dueDate }),
					});
					onRefresh();
				} catch (error) {
					console.error("Failed to update task text:", error);
					onRefresh();
				}
			}
		},
		[onUpdateText, onUpdateDueDate, onRefresh],
	);

	const handleSwitchTask = useCallback(
		async (newTask: Task, action: "complete" | "reenter") => {
			if (loadingTaskIds.has(newTask.id)) return;
			addLoading(newTask.id);
			try {
				await onSwitchTask(newTask, action);
			} finally {
				removeLoading(newTask.id);
			}
		},
		[loadingTaskIds, addLoading, removeLoading, onSwitchTask],
	);

	// Memoized row renderer
	const renderTaskRow = useCallback(
		(task: Task, index: number) => (
			<TaskRow
				key={task.id}
				task={task}
				isWorking={task.id === workingTaskId}
				workingTask={workingTask}
				onStart={handleStart}
				onDone={handleDone}
				onReenter={handleReenter}
				onDelete={handleDelete}
				onUpdateText={handleUpdateText}
				onUpdateTag={handleUpdateTag}
				onSwitchTask={handleSwitchTask}
				disabled={loadingTaskIds.has(task.id)}
				onPumpTask={handlePumpTask}
				onSinkTask={handleSinkTask}
				isFirst={index === 0 && task.page_number === 1}
				isLast={
					index === filteredTasks.length - 1 &&
					task.page_number === visibleTotalPages
				}
				disableSwipe={disableSwipeForWorkingTask && task.id === workingTaskId}
				pamphlets={pamphlets}
				activePamphletId={activePamphletId}
				onMoveTask={onMoveTask}
				onUpdateDueDate={handleUpdateDueDate}
			/>
		),
		[
			workingTaskId,
			workingTask,
			loadingTaskIds,
			filteredTasks.length,
			visibleTotalPages,
			disableSwipeForWorkingTask,
			pamphlets,
			activePamphletId,
			onMoveTask,
			handleStart,
			handleDone,
			handleReenter,
			handleDelete,
			handleUpdateText,
			handleUpdateTag,
			handleSwitchTask,
			handlePumpTask,
			handleSinkTask,
			handleUpdateDueDate,
		],
	);

	return (
		<div ref={containerRef} className="flex-1 flex flex-col min-h-0">
			<div
				className="flex-1 overflow-y-auto"
				style={{ scrollbarWidth: "thin" }}
			>
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={filteredTasks.map((t) => t.id)}
						strategy={verticalListSortingStrategy}
					>
						<ul ref={listRef} className="divide-y divide-border">
							{filteredTasks.map(renderTaskRow)}
						</ul>
					</SortableContext>
					<DragOverlay>
						{activeTask && (
							<TaskRow
								task={activeTask}
								isWorking={activeTask.id === workingTaskId}
								workingTask={workingTask}
								onStart={() => {}}
								onDone={() => {}}
								onReenter={() => {}}
								onDelete={() => {}}
								onUpdateText={() => {}}
								onUpdateTag={() => {}}
								onSwitchTask={async () => {}}
								disabled={false}
								isDragOverlay
								onPumpTask={() => {}}
								onSinkTask={() => {}}
								isFirst={false}
								isLast={false}
								pamphlets={pamphlets}
								activePamphletId={activePamphletId}
								onMoveTask={onMoveTask}
								onUpdateDueDate={handleUpdateDueDate}
							/>
						)}
					</DragOverlay>
				</DndContext>
			</div>
		</div>
	);
}
