"use client";

import { useCallback, useState, useMemo } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { revertTask } from "@/lib/store";
import { formatTimeCompact } from "./timer-bar";
import { TagFilter } from "./tag-filter";
import { TagPill } from "./tag-pill";
import type { TagId } from "@/lib/tags";

interface CompletedListProps {
	tasks: Task[];
	selectedTags: Set<TagId | "none">;
	onRefresh: () => Promise<void>;
	onDeleteTask: (taskId: string) => Promise<void>;
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

	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Yesterday";

	// Format as DD/MM/YY
	const day = date.getDate().toString().padStart(2, "0");
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const year = date.getFullYear().toString().slice(-2);
	return `${day}/${month}/${year}`;
}

function getDateKey(dateString: string): string {
	const date = new Date(dateString);
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

interface GroupedTasks {
	dateKey: string;
	dateLabel: string;
	tasks: Task[];
}

export function CompletedList({
	tasks,
	selectedTags,
	onRefresh,
	onDeleteTask,
}: CompletedListProps) {
	const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
		null,
	);

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
			if (!a.completed_at || !b.completed_at) return 0;
			return (
				new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
			);
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
				result.push({
					dateKey,
					dateLabel: formatDateGroup(groupTasks[0].completed_at),
					tasks: groupTasks,
				});
			}
		});

		return result;
	}, [filteredTasks]);

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
						<div className="px-4 py-2 bg-secondary/50 border-b border-border sticky top-0">
							<span className="text-sm text-muted-foreground font-medium">
								{group.dateLabel}
							</span>
						</div>

						{/* Tasks in this group */}
						<ul className="divide-y divide-border">
							{group.tasks.map((task) => {
								const isLoading = task.id === loadingTaskId;

								return (
									<li
										key={task.id}
										className={`
                    group px-4 py-2.5 flex items-center gap-3
                    ${isLoading ? "opacity-50" : ""}
                  `}
									>
										{/* Checkmark */}
										<span className="text-[#8b9a6b] flex-shrink-0">✓</span>

										{/* Task text */}
										<span className="flex-1 truncate text-muted-foreground line-through">
											{task.text}
										</span>

										{/* Completion time */}
										{task.completed_at && (
											<span className="text-xs text-muted-foreground flex-shrink-0">
												{formatCompletionTime(task.completed_at)}
											</span>
										)}

										{/* Time spent */}
										{task.total_time_ms > 0 && (
											<span className="text-xs text-[#8b9a6b] flex-shrink-0">
												{formatTimeCompact(task.total_time_ms)}
											</span>
										)}

										{/* Action buttons */}
										<div
											className={`
                    flex items-center gap-1 flex-shrink-0
                    md:opacity-0 md:group-hover:opacity-100 transition-opacity
                  `}
										>
											{/* Revert button */}
											<button
												onClick={() => handleRevert(task)}
												disabled={isLoading}
												className="p-1.5 hover:bg-accent rounded transition-colors disabled:opacity-30"
												title="Move back to active tasks"
											>
												<RotateCcw className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
											</button>

											{/* Delete button */}
											{showDeleteConfirm === task.id ? (
												<button
													onClick={() => handleDelete(task.id)}
													className="px-2 py-1 text-xs bg-destructive/20 text-destructive hover:bg-destructive/30 rounded transition-colors"
												>
													Yes
												</button>
											) : (
												<button
													onClick={() => handleDelete(task.id)}
													disabled={isLoading}
													className="p-1.5 hover:bg-accent rounded transition-colors disabled:opacity-30"
													title="Delete permanently"
												>
													<Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
												</button>
											)}
										</div>
									</li>
								);
							})}
						</ul>
					</div>
				))}
			</div>
		</div>
	);
}
