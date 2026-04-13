import React, { memo } from "react";
import { RotateCcw, Trash2, Info } from "lucide-react";
import type { Task } from "@/lib/types";
import type { TagId } from "@/lib/tags";
import { TagPill } from "@/components/shared/tag-pill";
import { formatCompletionTime } from "./utils";
import { formatTimeCompact } from "@/lib/utils/time-utils";
import { useSevenDayColumns } from "./hooks";

const SevenDayColumn = memo(function SevenDayColumn({
	column,
	loadingTaskId,
	loadingTagTaskId,
	showDeleteConfirm,
	onSelectTask,
	onRevertTask,
	onDeleteTask,
	onUpdateTag,
}: {
	column: {
		key: string;
		label: string;
		date: string;
		tasks: Task[];
	};
	loadingTaskId: string | null;
	loadingTagTaskId: string | null;
	showDeleteConfirm: string | null;
	onSelectTask: (id: string) => void;
	onRevertTask: (task: Task) => void;
	onDeleteTask: (id: string) => void;
	onUpdateTag: (taskId: string, tag: TagId | null) => void;
}) {
	return (
		<div className="flex flex-col min-w-[180px] sm:min-w-[220px] md:min-w-0 w-full">
			<div className="px-2 py-2 border-b border-border bg-secondary/50 sticky top-0 z-10 text-center">
				<p className="text-xs font-medium text-foreground">{column.label}</p>
				<p className="text-[10px] text-muted-foreground">{column.date}</p>
			</div>
			<div
				className="flex-1 overflow-y-auto overflow-x-hidden p-1.5 space-y-1 custom-scrollbar"
				style={{
					WebkitOverflowScrolling: "touch",
					touchAction: "pan-y",
				}}
			>
				<div className="flex-1 overflow-y-auto p-1.5 space-y-1">
					{column.tasks.length === 0 ? (
						<p className="text-[10px] text-muted-foreground text-center mt-4 px-1 opacity-50">
							—
						</p>
					) : (
						column.tasks.map((task) => {
							const isLoading = task.id === loadingTaskId;
							return (
								<div
									key={task.id}
									className={`group rounded-lg px-2 py-1.5 text-[11px] bg-secondary/50 hover:bg-secondary transition-colors space-y-1 ${isLoading ? "opacity-50" : ""}`}
								>
									<div className="flex items-start gap-1.5">
										{task.note && (
											<button
												type="button"
												onClick={() => onSelectTask(task.id)}
												className="bg-amber-100/80 dark:bg-amber-950/40 hover:bg-amber-200/80 dark:hover:bg-amber-900/60 transition-colors"
											>
												<Info className="w-3 h-3" />
											</button>
										)}
										<div className="flex-1 min-w-0">
											<p
												className="text-foreground line-through opacity-60 leading-snug break-words cursor-pointer"
												onClick={() => onSelectTask(task.id)}
											>
												{task.text}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-1 flex-wrap">
										{task.completed_at && (
											<span className="text-muted-foreground opacity-60">
												{formatCompletionTime(task.completed_at)}
											</span>
										)}
										{task.total_time_ms > 0 && (
											<span className="text-[#8b9a6b]">
												{formatTimeCompact(task.total_time_ms)}
											</span>
										)}
										<TagPill
											tagId={task.tag}
											onSelectTag={(tag) => onUpdateTag(task.id, tag)}
											disabled={loadingTagTaskId === task.id || isLoading}
											className="scale-90 origin-left"
										/>
									</div>
									<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<button
											type="button"
											onClick={() => onRevertTask(task)}
											disabled={isLoading}
											className="p-0.5 hover:bg-accent rounded transition-colors"
										>
											<RotateCcw className="w-3 h-3 text-muted-foreground" />
										</button>
										<button
											type="button"
											onClick={() => onDeleteTask(task.id)}
											disabled={isLoading}
											className={`p-0.5 rounded transition-colors ${showDeleteConfirm === task.id ? "bg-destructive/20" : "hover:bg-accent"}`}
										>
											<Trash2
												className={`w-3 h-3 ${showDeleteConfirm === task.id ? "text-destructive" : "text-muted-foreground"}`}
											/>
										</button>
									</div>
								</div>
							);
						})
					)}
				</div>
			</div>
		</div>
	);
});

export const SevenDayView = memo(function SevenDayView({
	columns,
	loadingTaskId,
	loadingTagTaskId,
	showDeleteConfirm,
	onSelectTask,
	onRevertTask,
	onDeleteTask,
	onUpdateTag,
}: {
	columns: ReturnType<typeof useSevenDayColumns>;
	loadingTaskId: string | null;
	loadingTagTaskId: string | null;
	showDeleteConfirm: string | null;
	onSelectTask: (id: string) => void;
	onRevertTask: (task: Task) => void;
	onDeleteTask: (id: string) => void;
	onUpdateTag: (taskId: string, tag: TagId | null) => void;
}) {
	return (
		<div className="h-full overflow-x-auto overflow-y-hidden">
			<div className="h-full overflow-x-auto custom-scrollbar">
				<div className="flex md:grid md:grid-cols-7 divide-x divide-border h-full">
					{columns.map((col) => (
						<SevenDayColumn
							key={col.key}
							column={col}
							loadingTaskId={loadingTaskId}
							loadingTagTaskId={loadingTagTaskId}
							showDeleteConfirm={showDeleteConfirm}
							onSelectTask={onSelectTask}
							onRevertTask={onRevertTask}
							onDeleteTask={onDeleteTask}
							onUpdateTag={onUpdateTag}
						/>
					))}
				</div>
			</div>
		</div>
	);
});
