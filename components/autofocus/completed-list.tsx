"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { RotateCcw, Trash2, Sunrise, CloudSun, Moon } from "lucide-react";
import { revertTask } from "@/lib/store";
import { formatTimeCompact } from "./timer-bar";
import { TagFilter } from "./tag-filter";
import { TagPill } from "./tag-pill";
import type { Task } from "@/lib/types";
import type { TagId } from "@/lib/tags";
import type { CompletedSortKey } from "./view-tabs";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface CompletedListProps {
	tasks: Task[];
	selectedTags: Set<TagId | "none">;
	completedSort: CompletedSortKey;
	onRefresh: () => Promise<void>;
	onDeleteTask: (taskId: string) => Promise<void>;
	hasMore: boolean;
	isLoadingMore: boolean;
	onLoadMore: () => void;
}

function formatCompletionTime(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}

function formatDateGroup(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const taskDate = new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
	);

	const diffDays = Math.floor(
		(today.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24),
	);

	// Format as DD/MM/YY
	const day = date.getDate().toString().padStart(2, "0");
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const year = date.getFullYear().toString().slice(-2);
	const numericDate = `${day}/${month}/${year}`;

	if (diffDays === 0) return `Today (${numericDate})`;
	if (diffDays === 1) return `Yesterday (${numericDate})`;

	return numericDate;
}

function getDateKey(dateString: string): string {
	const date = new Date(dateString);
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

interface GroupedTasks {
	dateKey: string;
	dateLabel: string;
	tasks: Task[];
	timeBlocks: TimeBlock[];
}

interface TimeBlock {
	period: "morning" | "afternoon" | "evening";
	label: string;
	icon: typeof Sunrise | typeof CloudSun | typeof Moon;
	tasks: Task[];
}

function getTimePeriod(
	dateString: string,
): "morning" | "afternoon" | "evening" {
	const hour = new Date(dateString).getHours();
	if (hour < 12) return "morning";
	if (hour < 18) return "afternoon";
	return "evening";
}

function getTimePeriodLabel(
	period: "morning" | "afternoon" | "evening",
): string {
	switch (period) {
		case "morning":
			return "Morning (00:00 - 11:59)";
		case "afternoon":
			return "Afternoon (12:00 - 17:59)";
		case "evening":
			return "Evening (18:00 - 23:59)";
	}
}

function getTimePeriodIcon(period: "morning" | "afternoon" | "evening") {
	switch (period) {
		case "morning":
			return Sunrise;
		case "afternoon":
			return CloudSun;
		case "evening":
			return Moon;
	}
}

function getTimePeriodColor(
	period: "morning" | "afternoon" | "evening",
): string {
	switch (period) {
		case "morning":
			return "bg-sky-100/80 dark:bg-sky-950/70";
		case "afternoon":
			return "bg-amber-100/80 dark:bg-amber-950/40";
		case "evening":
			return "bg-blue-100/80 dark:bg-blue-950/20";
	}
}

function getTimePeriodIconColor(
	period: "morning" | "afternoon" | "evening",
): string {
	switch (period) {
		case "morning":
			return "text-sky-500";
		case "afternoon":
			return "text-amber-500";
		case "evening":
			return "text-indigo-400";
	}
}

export function CompletedList({
	tasks,
	selectedTags,
	completedSort,
	hasMore,
	isLoadingMore,
	onLoadMore,
	onRefresh,
	onDeleteTask,
}: CompletedListProps) {
	const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
		null,
	);
	const [showTaskModal, setShowTaskModal] = useState<string | null>(null);
	const textRefs = useRef<{ [key: string]: HTMLSpanElement }>({});

	// Filter tasks by selected tags
	const filteredTasks = useMemo(() => {
		if (selectedTags.size === 0) return tasks;

		return tasks.filter((task) => {
			if (selectedTags.has("none")) {
				return task.tag === null;
			}
			return task.tag && selectedTags.has(task.tag);
		});
	}, [tasks, selectedTags]);

	// Group tasks by completion date
	const groupedTasks = useMemo(() => {
		const groups: Map<string, Task[]> = new Map();

		// Sort tasks by completion time descending
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

		// Convert to array and sort by date descending
		const result: GroupedTasks[] = [];
		groups.forEach((groupTasks, dateKey) => {
			if (groupTasks.length > 0 && groupTasks[0].completed_at) {
				// Group tasks by time of day within this date
				const timeBlocksMap = new Map<string, Task[]>();

				groupTasks.forEach((task) => {
					if (!task.completed_at) return;
					const period = getTimePeriod(task.completed_at);
					if (!timeBlocksMap.has(period)) {
						timeBlocksMap.set(period, []);
					}
					timeBlocksMap.get(period)!.push(task);
				});

				// Convert to array and sort by time period (morning -> afternoon -> evening)
				const periodOrder =
					completedSort === "completed_asc"
						? ["morning", "afternoon", "evening"]
						: completedSort === "default"
							? ["morning", "afternoon", "evening"]
							: ["evening", "afternoon", "morning"];

				const timeBlocks: TimeBlock[] = periodOrder
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

	const handleRevert = useCallback(
		async (task: Task) => {
			if (loadingTaskId) return;

			setLoadingTaskId(task.id);
			try {
				await revertTask(task.id);
				await onRefresh();
			} finally {
				setLoadingTaskId(null);
			}
		},
		[loadingTaskId, onRefresh],
	);

	const handleDelete = useCallback(
		async (taskId: string) => {
			if (loadingTaskId) return;

			if (showDeleteConfirm === taskId) {
				setLoadingTaskId(taskId);
				try {
					await onDeleteTask(taskId);
				} finally {
					setLoadingTaskId(null);
					setShowDeleteConfirm(null);
				}
			} else {
				setShowDeleteConfirm(taskId);
				// Auto-hide after 3 seconds
				setTimeout(() => setShowDeleteConfirm(null), 3000);
			}
		},
		[loadingTaskId, showDeleteConfirm, onDeleteTask],
	);

	if (tasks.length === 0) {
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
				{groupedTasks.map((group) => (
					<div key={group.dateKey} className="mb-4">
						{/* Date header */}
						<div className="px-4 py-2 bg-secondary/50 border-b border-border sticky top-0 z-10">
							<span className="text-sm text-muted-foreground font-medium">
								{group.dateLabel}
							</span>
						</div>

						{/* Time blocks within this date */}
						{group.timeBlocks.map((timeBlock) => {
							const Icon = timeBlock.icon;
							return (
								<div
									key={timeBlock.period}
									className={`flex gap-3 ${getTimePeriodColor(timeBlock.period)} py-2 px-3`}
								>
									{/* Time period icon on the left - vertically centered */}
									<div className="flex items-center">
										<Icon
											className={`w-4 h-4 ${getTimePeriodIconColor(timeBlock.period)}`}
										/>
									</div>

									{/* Tasks in this time block */}
									<div className="flex-1 min-w-0">
										<ul className="divide-y divide-border/50">
											{timeBlock.tasks.map((task) => {
												const isLoading = task.id === loadingTaskId;

												return (
													<li
														key={task.id}
														className={`
															group py-2.5 flex items-center gap-3
															${isLoading ? "opacity-50" : ""}
														`}
													>
														{/* Checkmark */}
														<span className="text-[#8b9a6b] flex-shrink-0">
															✓
														</span>

														{/* Task text */}
														<span
															ref={(el) => {
																if (el && task.id) {
																	textRefs.current[task.id] = el;
																}
															}}
															className="flex-1 truncate text-muted-foreground line-through cursor-pointer hover:text-foreground/70 transition-colors"
															onClick={() => {
																const element = textRefs.current[task.id];
																if (
																	element &&
																	element.scrollWidth > element.clientWidth
																) {
																	setShowTaskModal(task.id);
																}
															}}
															title="Click to view full text"
														>
															{task.text}
														</span>

														{/* Time spent */}
														{task.total_time_ms > 0 && (
															<span className="text-xs text-[#8b9a6b] flex-shrink-0">
																{formatTimeCompact(task.total_time_ms)}
															</span>
														)}

														{/* Completion time */}
														{task.completed_at && (
															<span className="text-xs text-muted-foreground flex-shrink-0">
																{formatCompletionTime(task.completed_at)}
															</span>
														)}

														{/* Tag pill */}
														{task.tag && (
															<TagPill
																tagId={task.tag}
																className="flex-shrink-0"
															/>
														)}

														{/* Action buttons */}
														<div className="flex items-center gap-1 flex-shrink-0">
															{/* Revert button */}
															<button
																type="button"
																onClick={() => handleRevert(task)}
																disabled={isLoading}
																className="p-1.5 hover:bg-accent rounded-sm transition-colors disabled:opacity-50"
																title="Re-enter task"
															>
																<RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
															</button>

															{/* Delete button */}
															<button
																type="button"
																onClick={() => handleDelete(task.id)}
																disabled={isLoading}
																className={`p-1.5 rounded-sm transition-colors disabled:opacity-50 ${
																	showDeleteConfirm === task.id
																		? "bg-destructive/20 hover:bg-destructive/30"
																		: "hover:bg-accent"
																}`}
																title={
																	showDeleteConfirm === task.id
																		? "Click again to confirm"
																		: "Delete task"
																}
															>
																<Trash2
																	className={`w-3.5 h-3.5 ${
																		showDeleteConfirm === task.id
																			? "text-destructive"
																			: "text-muted-foreground"
																	}`}
																/>
															</button>
														</div>
													</li>
												);
											})}
										</ul>
									</div>
								</div>
							);
						})}
					</div>
				))}

				{/* Load More */}
				{hasMore && (
					<div className="flex justify-center py-6">
						<button
							type="button"
							onClick={onLoadMore}
							disabled={isLoadingMore}
							className="px-4 py-2 text-sm border border-border rounded-full hover:bg-accent transition-colors disabled:opacity-50 text-muted-foreground"
						>
							{isLoadingMore ? "Loading..." : "Load more"}
						</button>
					</div>
				)}

				{!hasMore && tasks.length > 0 && (
					<div className="flex justify-center py-6">
						<p className="text-xs text-muted-foreground">
							All completed tasks loaded 🎉
						</p>
					</div>
				)}
			</div>

			{/* Task detail modal */}
			{showTaskModal && (
				<Dialog
					open={!!showTaskModal}
					onOpenChange={() => setShowTaskModal(null)}
				>
					<DialogContent className="sm:max-w-[500px] max-w-[calc(100vw-2rem)]">
						<DialogHeader>
							<DialogTitle>Completed Task</DialogTitle>
						</DialogHeader>
						<div className="pt-4 overflow-hidden">
							<p className="text-sm text-muted-foreground line-through break-words overflow-wrap-anywhere">
								{tasks.find((t) => t.id === showTaskModal)?.text}
							</p>
						</div>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
