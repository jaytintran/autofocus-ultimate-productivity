import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import type { Task, TimeBlock } from "@/lib/types";
import { ChevronLeft, Pencil, X, Play } from "lucide-react";
import { BLOCK_COLORS } from "../constants";
import { isTaskInBlock, getTaskScheduledTime } from "../utils";

export function BlockDetailPanel({
	block,
	tasks,
	completedTasks,
	onClose,
	onStartTask,
	onUnscheduleTask,
	onUpdateBlock,
	onDeleteBlock,
}: {
	block: TimeBlock;
	tasks: Task[];
	completedTasks: Task[];
	onClose: () => void;
	onStartTask: (task: Task) => void;
	onUnscheduleTask: (taskId: string) => Promise<void>;
	onUpdateBlock: (id: string, updates: Partial<TimeBlock>) => Promise<void>;
	onDeleteBlock: (id: string) => Promise<void>;
}) {
	const [isEditing, setIsEditing] = useState(false);
	const [editLabel, setEditLabel] = useState(block.label);
	const [editColor, setEditColor] = useState(block.color);

	// Sync edit state when block changes
	useEffect(() => {
		setEditLabel(block.label);
		setEditColor(block.color);
		setIsEditing(false);
	}, [block.id, block.label, block.color]);

	const blockTasks = useMemo(() => {
		return [...tasks, ...completedTasks]
			.filter((t) => isTaskInBlock(t, block))
			.sort((a, b) => {
				const aTime = getTaskScheduledTime(a)?.getTime() || 0;
				const bTime = getTaskScheduledTime(b)?.getTime() || 0;
				return aTime - bTime;
			});
	}, [tasks, completedTasks, block]);

	return (
		<div className="w-full md:w-80 shrink-0 flex flex-col min-h-0 border-l border-border">
			{/* Panel header */}
			<div
				className="px-4 py-3 shrink-0 flex items-center justify-between"
				style={{ backgroundColor: block.color || "var(--af4-olive)" }}
			>
				<div className="flex flex-col gap-0.5 min-w-0">
					<span
						className="font-semibold text-sm truncate"
						style={{ color: "var(--primary-foreground)" }}
					>
						{block.label}
					</span>
					<span
						className="text-xs opacity-75"
						style={{ color: "var(--primary-foreground)" }}
					>
						{format(new Date(block.start_time), "h:mm a")} –{" "}
						{format(new Date(block.end_time), "h:mm a")}
					</span>
				</div>
				<div className="flex gap-1">
					{/* Edit button */}
					<button
						onClick={() => setIsEditing(true)}
						className="p-1.5 rounded hover:bg-white/20 transition-colors"
						style={{ color: "var(--primary-foreground)" }}
						title="Edit block"
					>
						<Pencil className="w-4 h-4" />
					</button>
					<button onClick={onClose} className="p-1 rounded hover:bg-card/10">
						<ChevronLeft className="w-4 h-4 text-muted" />
					</button>
				</div>
			</div>

			{/* Edit form or task count */}
			{isEditing ? (
				<div className="px-4 py-3 space-y-3 border-b border-border shrink-0 bg-card">
					<div>
						<label className="text-xs text-muted-foreground block mb-1.5">
							Title
						</label>
						<input
							type="text"
							value={editLabel}
							onChange={(e) => setEditLabel(e.target.value)}
							className="w-full text-sm px-2 py-1.5 rounded border border-input bg-background"
							autoFocus
						/>
					</div>
					<div>
						<label className="text-xs text-muted-foreground block mb-1.5">
							Color
						</label>
						<div className="flex flex-wrap gap-1.5">
							{BLOCK_COLORS.map((color) => (
								<button
									key={color}
									onClick={() => setEditColor(color)}
									className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
									style={{
										backgroundColor: color,
										borderColor:
											editColor === color ? "var(--foreground)" : "transparent",
									}}
								/>
							))}
						</div>
					</div>
					<div className="flex gap-2 pt-1">
						<button
							onClick={() => {
								const trimmed = editLabel.trim();
								if (trimmed) {
									onUpdateBlock(block.id, { label: trimmed, color: editColor });
								}
								setIsEditing(false);
							}}
							className="flex-1 bg-[#8b9a6b] text-white text-xs font-medium py-1.5 rounded hover:bg-[#8b9a6b]/90"
						>
							Save
						</button>
						<button
							onClick={() => {
								setEditLabel(block.label);
								setEditColor(block.color);
								setIsEditing(false);
							}}
							className="flex-1 bg-muted text-xs font-medium py-1.5 rounded hover:bg-muted/80"
						>
							Cancel
						</button>
					</div>
				</div>
			) : (
				<div className="px-4 py-2 border-b border-border shrink-0">
					<p className="text-xs text-muted-foreground">
						{blockTasks.length === 0
							? "No tasks — drag tasks here"
							: `${blockTasks.length} task${blockTasks.length > 1 ? "s" : ""}`}
					</p>
				</div>
			)}

			{/* Task list */}
			<div className="flex-1 overflow-y-auto p-3 space-y-2">
				{blockTasks.length === 0 ? (
					<p className="text-xs text-muted-foreground text-center py-8 opacity-50">
						Drop tasks from the timeline
					</p>
				) : (
					blockTasks.map((task) => (
						<div
							key={task.id}
							className="flex items-center gap-2 p-2 rounded-md border border-border bg-card text-sm group"
						>
							<div className="flex-1 min-w-0">
								<p
									className={`truncate ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}
								>
									{task.text}
								</p>
								{task.scheduled_at && (
									<p className="text-xs text-muted-foreground">
										{format(new Date(task.scheduled_at), "h:mm a")}
									</p>
								)}
							</div>

							{/* Start button */}
							{task.status !== "completed" && (
								<button
									onClick={() => onStartTask(task)}
									className="p-1 hover:bg-accent rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
									title="Start task"
								>
									<Play className="w-3.5 h-3.5 text-af4-olive" />
								</button>
							)}

							{/* Remove from block */}
							<button
								onClick={() => onUnscheduleTask(task.id)}
								className="p-1 hover:bg-destructive/10 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
								title="Remove from block"
							>
								<span className="text-xs text-muted-foreground hover:text-destructive">
									<X className="w-3 h-3" />
								</span>
							</button>
						</div>
					))
				)}
			</div>

			{/* Delete block footer */}
			<div className="p-3 border-t border-border shrink-0 hover:bg-destructive/10 transition-colors">
				<button
					onClick={async () => {
						await onDeleteBlock(block.id);
						onClose();
					}}
					className="w-full text-xs text-destructive rounded py-1.5 "
				>
					Delete Block
				</button>
			</div>
		</div>
	);
}
