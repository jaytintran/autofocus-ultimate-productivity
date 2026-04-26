import React, { useState, useMemo, useCallback } from "react";
import type { CompletedListProps, GroupedTasks } from "./types";
import type { TagId } from "@/lib/tags";
import { useSevenDayColumns, useDeleteConfirmation, useClipboardCopy, useDeleteDayConfirmation } from "./hooks";
import { BulletJournalView } from "./day-group";
import { SevenDayView } from "./seven-day-view";
import { DefaultView } from "./default-view";
import { EntryModal } from "./entry-modal";
import { LogActivityBar } from "./log-activity-bar";
import { generateDayMarkdown } from "./export-utils";
import { getDateKey, getTimePeriod, getTimePeriodLabel, getTimePeriodIcon, formatDateGroup } from "./utils";

export function CompletedList({
	tasks,
	selectedTags,
	completedSort,
	completedViewType,
	hasMore,
	isLoadingMore,
	onLoadMore,
	onRefresh,
	onDeleteTask,
	onRevertTask,
	onUpdateTaskTag,
	onUpdateTaskNote,
	onUpdateTaskText,
	onAddLoggedActivity,
	pamphlets,
	activePamphletId,
	buJoWidth,
	completedSearch,
}: CompletedListProps) {
	// Loading states
	const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
	const [loadingTagTaskId, setLoadingTagTaskId] = useState<string | null>(null);
	const [showTaskModal, setShowTaskModal] = useState<string | null>(null);

	// Custom hooks for timeouts (with proper cleanup)
	const { showDeleteConfirm, requestDelete, clearDelete } =
		useDeleteConfirmation();
	const { copiedDateKey, copy: copyToClipboard } = useClipboardCopy();
	const { showDeleteDayConfirm, requestDeleteDay, clearDeleteDay } =
		useDeleteDayConfirmation();

	// Memoized values
	const filteredTasks = useMemo(() => {
		let result = tasks;
		if (selectedTags.size > 0) {
			result = result.filter((task) => {
				if (selectedTags.has("none") && task.tag === null) return true;
				return task.tag !== null && selectedTags.has(task.tag);
			});
		}
		if (completedSearch?.trim()) {
			const q = completedSearch.toLowerCase();
			result = result.filter((t) => t.text.toLowerCase().includes(q));
		}
		return result;
	}, [tasks, selectedTags, completedSearch]);

	const groupedTasks = useMemo(() => {
		const groups: Map<string, typeof tasks> = new Map();

		const sortedTasks = [...filteredTasks].sort((a, b) => {
			switch (completedSort) {
				case "default":
					if (!a.completed_at || !b.completed_at) return 0;
					return (
						new Date(b.completed_at).getTime() -
						new Date(a.completed_at).getTime()
					);
				case "completed_asc":
					if (!a.completed_at || !b.completed_at) return 0;
					return (
						new Date(a.completed_at).getTime() -
						new Date(b.completed_at).getTime()
					);
				case "time_spent_desc":
					return b.total_time_ms - a.total_time_ms;
				case "completed_desc":
				default:
					if (!a.completed_at || !b.completed_at) return 0;
					return (
						new Date(b.completed_at).getTime() -
						new Date(a.completed_at).getTime()
					);
			}
		});

		sortedTasks.forEach((task) => {
			if (!task.completed_at) return;
			const key = getDateKey(task.completed_at);
			if (!groups.has(key)) {
				groups.set(key, []);
			}
			groups.get(key)!.push(task);
		});

		const result: GroupedTasks[] = [];
		groups.forEach((groupTasks, dateKey) => {
			if (groupTasks.length > 0 && groupTasks[0].completed_at) {
				const timeBlocksMap = new Map<string, typeof tasks>();

				groupTasks.forEach((task) => {
					if (!task.completed_at) return;
					const period = getTimePeriod(task.completed_at);
					if (!timeBlocksMap.has(period)) {
						timeBlocksMap.set(period, []);
					}
					timeBlocksMap.get(period)!.push(task);
				});

				const periodOrder =
					completedSort === "completed_asc"
						? ["morning", "afternoon", "evening"]
						: completedSort === "default"
							? ["morning", "afternoon", "evening"]
							: ["evening", "afternoon", "morning"];

				const timeBlocks = periodOrder
					.filter((period) => timeBlocksMap.has(period))
					.map((period) => ({
						period: period as "morning" | "afternoon" | "evening",
						label: getTimePeriodLabel(
							period as "morning" | "afternoon" | "evening",
						),
						icon: getTimePeriodIcon(
							period as "morning" | "afternoon" | "evening",
						),
						tasks: timeBlocksMap.get(period)!,
					}));

				result.push({
					dateKey,
					dateLabel: formatDateGroup(groupTasks[0].completed_at),
					tasks: groupTasks,
					timeBlocks,
				});
			}
		});

		return result;
	}, [filteredTasks, completedSort]);

	const sevenDayColumns = useSevenDayColumns(filteredTasks);

	// Memoized callbacks
	const handleRevert = useCallback(
		async (task: typeof tasks[0]) => {
			if (loadingTaskId) return;
			setLoadingTaskId(task.id);
			try {
				await onRevertTask(task);
			} finally {
				setLoadingTaskId(null);
			}
		},
		[loadingTaskId, onRevertTask],
	);

	const handleDelete = useCallback(
		async (taskId: string) => {
			if (loadingTaskId) return;

			if (showDeleteConfirm === taskId) {
				setLoadingTaskId(taskId);
				clearDelete();
				try {
					await onDeleteTask(taskId);
				} finally {
					setLoadingTaskId(null);
				}
			} else {
				requestDelete(taskId);
			}
		},
		[
			loadingTaskId,
			showDeleteConfirm,
			clearDelete,
			requestDelete,
			onDeleteTask,
		],
	);

	const handleUpdateTag = useCallback(
		async (taskId: string, tag: TagId | null) => {
			if (loadingTagTaskId === taskId) return;
			if (!onUpdateTaskTag) return;

			setLoadingTagTaskId(taskId);
			try {
				await onUpdateTaskTag(taskId, tag);
				await onRefresh();
			} finally {
				setLoadingTagTaskId(null);
			}
		},
		[loadingTagTaskId, onUpdateTaskTag, onRefresh],
	);

	const handleSelectTask = useCallback((id: string) => {
		setShowTaskModal(id);
	}, []);

	const handleCloseModal = useCallback(() => {
		setShowTaskModal(null);
	}, []);

	const handleExportDay = useCallback(
		async (group: GroupedTasks) => {
			const md = generateDayMarkdown(group, pamphlets, activePamphletId);
			await navigator.clipboard.writeText(md);
			copyToClipboard(group.dateKey);
		},
		[pamphlets, activePamphletId, copyToClipboard],
	);

	const handleDeleteDay = useCallback(
		async (dateKey: string) => {
			if (showDeleteDayConfirm === dateKey) {
				// Confirmed - delete all tasks for this day
				clearDeleteDay();
				const group = groupedTasks.find((g) => g.dateKey === dateKey);
				if (!group) return;

				// Delete all tasks in this day
				const deletePromises = group.tasks.map((task) => onDeleteTask(task.id));
				await Promise.all(deletePromises);
				await onRefresh();
			} else {
				// First click - request confirmation
				requestDeleteDay(dateKey);
			}
		},
		[showDeleteDayConfirm, clearDeleteDay, requestDeleteDay, groupedTasks, onDeleteTask, onRefresh],
	);

	const handleLoadMore = useCallback(() => {
		onLoadMore();
	}, [onLoadMore]);

	const handleModalSave = useCallback(
		async (
			id: string,
			title: string,
			note: string,
			tag: TagId | null,
			completedAt?: string | null,
			totalTimeMs?: number,
		) => {
			const updates: Array<Promise<void>> = [
				onUpdateTaskText ? onUpdateTaskText(id, title) : Promise.resolve(),
				onUpdateTaskNote
					? onUpdateTaskNote(id, note || null)
					: Promise.resolve(),
				onUpdateTaskTag ? onUpdateTaskTag(id, tag) : Promise.resolve(),
			];

			// Update completed_at if provided
			if (completedAt !== undefined && completedAt !== null) {
				updates.push(
					onUpdateTaskNote
						? (async () => {
								const { updateTask } = await import("@/lib/db/store");
								await updateTask(id, { completed_at: completedAt });
							})()
						: Promise.resolve(),
				);
			}

			// Update total_time_ms if provided
			if (totalTimeMs !== undefined) {
				updates.push(
					onUpdateTaskNote
						? (async () => {
								const { updateTask } = await import("@/lib/db/store");
								await updateTask(id, { total_time_ms: totalTimeMs });
							})()
						: Promise.resolve(),
				);
			}

			await Promise.all(updates);
			await onRefresh();
		},
		[onUpdateTaskText, onUpdateTaskNote, onUpdateTaskTag, onRefresh],
	);

	const handleModalDelete = useCallback(
		async (id: string) => {
			await onDeleteTask(id);
		},
		[onDeleteTask],
	);

	const handleModalRevert = useCallback(
		async (id: string) => {
			const task = tasks.find((t) => t.id === id);
			if (task) await onRevertTask(task);
		},
		[tasks, onRevertTask],
	);

	// Find modal task
	const modalTask = useMemo(
		() => tasks.find((t) => t.id === showTaskModal) ?? null,
		[tasks, showTaskModal],
	);

	// Empty state
	if (tasks.length === 0 && completedViewType !== "bullet") {
		return (
			<div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
				<p className="text-muted-foreground font-medium">
					No completed tasks yet.
				</p>
				<p className="text-muted-foreground text-sm mt-1">
					Complete tasks from the Tasks view.
				</p>
			</div>
		);
	}

	return (
		<div className="flex-1 flex flex-col min-h-0">
			<div className="flex-1 overflow-y-auto">
				{completedViewType === "bullet" ? (
					<BulletJournalView
						groupedTasks={groupedTasks}
						loadingTaskId={loadingTaskId}
						loadingTagTaskId={loadingTagTaskId}
						showDeleteConfirm={showDeleteConfirm}
						copiedDateKey={copiedDateKey}
						showDeleteDayConfirm={showDeleteDayConfirm}
						hasMore={hasMore}
						isLoadingMore={isLoadingMore}
						onSelectTask={handleSelectTask}
						onRevertTask={handleRevert}
						onDeleteTask={handleDelete}
						onUpdateTag={handleUpdateTag}
						onLoadMore={handleLoadMore}
						onExportDay={handleExportDay}
						onDeleteDay={handleDeleteDay}
						buJoWidth={buJoWidth!}
					/>
				) : completedViewType === "7days" ? (
					<SevenDayView
						columns={sevenDayColumns}
						loadingTaskId={loadingTaskId}
						loadingTagTaskId={loadingTagTaskId}
						showDeleteConfirm={showDeleteConfirm}
						onSelectTask={handleSelectTask}
						onRevertTask={handleRevert}
						onDeleteTask={handleDelete}
						onUpdateTag={handleUpdateTag}
					/>
				) : (
					<DefaultView
						groupedTasks={groupedTasks}
						loadingTaskId={loadingTaskId}
						loadingTagTaskId={loadingTagTaskId}
						showDeleteConfirm={showDeleteConfirm}
						hasMore={hasMore}
						isLoadingMore={isLoadingMore}
						onSelectTask={handleSelectTask}
						onUpdateTag={handleUpdateTag}
						onLoadMore={handleLoadMore}
					/>
				)}
			</div>

			{showTaskModal && modalTask && (
				<EntryModal
					task={modalTask}
					onClose={handleCloseModal}
					onSave={handleModalSave}
					onDelete={handleModalDelete}
					onRevert={handleModalRevert}
				/>
			)}

			{completedViewType === "bullet" && onAddLoggedActivity && (
				<LogActivityBar onAddLoggedActivity={onAddLoggedActivity} />
			)}
		</div>
	);
}
