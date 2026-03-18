"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { GripVertical, Play, Check, RefreshCw, Trash2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { reenterTask, updateTask, getNextPosition } from "@/lib/store";
import { formatTimeCompact } from "./timer-bar";

interface TaskListProps {
	tasks: Task[];
	allTasks: Task[]; // All active tasks for cross-page reordering
	workingTaskId: string | null;
	onRefresh: () => Promise<void>;
	pageSize: number;
	onStartTask: (task: Task) => Promise<void>;
	onDoneTask: (task: Task) => Promise<void>;
	onDeleteTask: (taskId: string) => Promise<void>;
	onReorderTasks: (
		draggedTaskId: string,
		targetTaskId: string,
	) => Promise<void>;
}

interface TaskRowProps {
	task: Task;
	isWorking: boolean;
	onStart: (task: Task) => void;
	onDone: (task: Task) => void;
	onReenter: (task: Task) => void;
	onDelete: (taskId: string) => void;
	onUpdateText: (taskId: string, newText: string) => void;
	onDragStart: (e: React.DragEvent, task: Task) => void;
	onDragOver: (e: React.DragEvent, task: Task) => void;
	onDragEnd: () => void;
	isDragging: boolean;
	isDropTarget: boolean;
	disabled: boolean;
}

function TaskRow({
	task,
	isWorking,
	onStart,
	onDone,
	onReenter,
	onDelete,
	onUpdateText,
	onDragStart,
	onDragOver,
	onDragEnd,
	isDragging,
	isDropTarget,
	disabled,
}: TaskRowProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editText, setEditText] = useState(task.text);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	const handleTextClick = (e: React.MouseEvent) => {
		// Allow editing unless this specific task is the one being worked on
		if (isWorking) return;
		e.stopPropagation();
		setEditText(task.text);
		setIsEditing(true);
	};

	const handleSave = () => {
		const trimmed = editText.trim();
		if (trimmed && trimmed !== task.text) {
			onUpdateText(task.id, trimmed);
		}
		setIsEditing(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSave();
		} else if (e.key === "Escape") {
			setEditText(task.text);
			setIsEditing(false);
		}
	};

	const handleDeleteClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (showDeleteConfirm) {
			onDelete(task.id);
			setShowDeleteConfirm(false);
		} else {
			setShowDeleteConfirm(true);
			// Auto-hide after 3 seconds
			setTimeout(() => setShowDeleteConfirm(false), 3000);
		}
	};

	return (
		<li
			draggable={!isWorking && !isEditing && !disabled}
			onDragStart={(e) => onDragStart(e, task)}
			onDragOver={(e) => onDragOver(e, task)}
			onDragEnd={onDragEnd}
			className={`
        group px-4 py-2.5 flex items-center gap-2
        ${isWorking ? "bg-[#8b9a6b]/15 border-l-2 border-[#8b9a6b]" : ""}
        ${isDragging ? "opacity-50 bg-accent" : ""}
        ${isDropTarget ? "border-t-2 border-[#8b9a6b]" : ""}
        transition-colors
      `}
		>
			{/* Drag handle */}
			<div
				className={`
          cursor-grab active:cursor-grabbing text-muted-foreground
          ${isWorking || disabled ? "opacity-30" : "opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100"}
          transition-opacity flex-shrink-0
        `}
			>
				<GripVertical className="w-4 h-4" />
			</div>

			{/* Task text - clickable area to start task */}
			<div
				className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer"
				onClick={() => !isWorking && !isEditing && !disabled && onStart(task)}
			>
				{isEditing ? (
					<input
						ref={inputRef}
						type="text"
						value={editText}
						onChange={(e) => setEditText(e.target.value)}
						onBlur={handleSave}
						onKeyDown={handleKeyDown}
						onClick={(e) => e.stopPropagation()}
						className="flex-1 bg-transparent border-b border-[#8b9a6b] outline-none py-0.5 text-foreground"
					/>
				) : (
					<span
						onClick={handleTextClick}
						className={`
              truncate cursor-text
              ${isWorking ? "text-[#ddd4b8]" : ""}
              ${!isWorking && !disabled ? "hover:text-[#ddd4b8]" : ""}
            `}
					>
						{task.text}
					</span>
				)}
			</div>

			{/* Right side: badges and action buttons */}
			<div className="flex items-center gap-1.5 flex-shrink-0">
				{/* Re-entered badge */}
				{task.re_entered_from && !isEditing && (
					<span className="text-[10px] px-1.5 py-0.5 rounded border border-[#c49a6b]/40 bg-[#c49a6b]/10 text-[#c49a6b] flex-shrink-0">
						re-entered
					</span>
				)}

				{/* Time spent badge */}
				{task.total_time_ms > 0 && !isEditing && (
					<span className="text-[10px] px-1.5 py-0.5 rounded border border-muted-foreground/30 bg-muted/50 text-muted-foreground flex-shrink-0">
						{formatTimeCompact(task.total_time_ms)}
					</span>
				)}

				{/* Action buttons */}
				{!isWorking && !isEditing && (
					<div
						className={`
            flex items-center gap-1 flex-shrink-0
            md:opacity-0 md:group-hover:opacity-100 transition-opacity
          `}
					>
						{/* Start button */}
						<button
							onClick={(e) => {
								e.stopPropagation();
								onStart(task);
							}}
							disabled={disabled}
							className="p-1.5 hover:bg-accent rounded transition-colors disabled:opacity-30"
							title="Start working on this task"
						>
							<Play className="w-3.5 h-3.5 text-[#8b9a6b]" />
						</button>

						{/* Done button */}
						<button
							onClick={(e) => {
								e.stopPropagation();
								onDone(task);
							}}
							disabled={disabled}
							className="p-1.5 hover:bg-accent rounded transition-colors disabled:opacity-30"
							title="Mark as done"
						>
							<Check className="w-3.5 h-3.5 text-[#8b9a6b]" />
						</button>

						{/* Re-enter button */}
						<button
							onClick={(e) => {
								e.stopPropagation();
								onReenter(task);
							}}
							disabled={disabled}
							className="p-1.5 hover:bg-accent rounded transition-colors disabled:opacity-30"
							title="Re-enter at end of list"
						>
							<RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
						</button>

						{/* Delete button */}
						{showDeleteConfirm ? (
							<button
								onClick={handleDeleteClick}
								className="px-2 py-1 text-xs bg-destructive/20 text-destructive hover:bg-destructive/30 rounded transition-colors"
							>
								Yes
							</button>
						) : (
							<button
								onClick={handleDeleteClick}
								disabled={disabled}
								className="p-1.5 hover:bg-accent rounded transition-colors disabled:opacity-30"
								title="Delete task"
							>
								<Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
							</button>
						)}
					</div>
				)}
			</div>
		</li>
	);
}

export function TaskList({
	tasks,
	allTasks,
	workingTaskId,
	onRefresh,
	pageSize,
	onStartTask,
	onDoneTask,
	onDeleteTask,
	onReorderTasks,
}: TaskListProps) {
	const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
	const [draggedTask, setDraggedTask] = useState<Task | null>(null);
	const [dropTargetId, setDropTargetId] = useState<string | null>(null);
	const [isReordering, setIsReordering] = useState(false);

	const handleStart = useCallback(
		async (task: Task) => {
			if (loadingTaskId || workingTaskId) return;
			setLoadingTaskId(task.id);
			try {
				await onStartTask(task);
			} finally {
				setLoadingTaskId(null);
			}
		},
		[loadingTaskId, workingTaskId, onStartTask],
	);

	const handleDone = useCallback(
		async (task: Task) => {
			if (loadingTaskId) return;
			setLoadingTaskId(task.id);
			try {
				await onDoneTask(task);
			} finally {
				setLoadingTaskId(null);
			}
		},
		[loadingTaskId, onDoneTask],
	);

	const handleReenter = useCallback(
		async (task: Task) => {
			if (loadingTaskId) return;
			setLoadingTaskId(task.id);
			try {
				const maxPage = Math.max(...allTasks.map((t) => t.page_number), 1);
				const position = await getNextPosition(maxPage);
				await reenterTask(task.id, task.text, maxPage, position);
				await onDoneTask(task);
				await onRefresh();
			} finally {
				setLoadingTaskId(null);
			}
		},
		[loadingTaskId, allTasks, onDoneTask, onRefresh],
	);

	const handleDelete = useCallback(
		async (taskId: string) => {
			if (loadingTaskId) return;
			setLoadingTaskId(taskId);
			try {
				await onDeleteTask(taskId);
			} finally {
				setLoadingTaskId(null);
			}
		},
		[loadingTaskId, onDeleteTask],
	);

	const handleUpdateText = useCallback(
		async (taskId: string, newText: string) => {
			try {
				await updateTask(taskId, { text: newText });
				await onRefresh();
			} catch (error) {
				console.error("Failed to update task text:", error);
			}
		},
		[onRefresh],
	);

	const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
		setDraggedTask(task);
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", task.id);
	}, []);

	const handleDragOver = useCallback(
		(e: React.DragEvent, targetTask: Task) => {
			e.preventDefault();
			if (draggedTask && draggedTask.id !== targetTask.id) {
				setDropTargetId(targetTask.id);
			}
		},
		[draggedTask],
	);

	const handleDragEnd = useCallback(async () => {
		if (!draggedTask || !dropTargetId) {
			setDraggedTask(null);
			setDropTargetId(null);
			return;
		}

		try {
			setIsReordering(true);
			await onReorderTasks(draggedTask.id, dropTargetId);
		} catch (error) {
			console.error("Failed to reorder tasks:", error);
		} finally {
			setIsReordering(false);
			setDraggedTask(null);
			setDropTargetId(null);
		}
	}, [draggedTask, dropTargetId, onReorderTasks]);

	if (tasks.length === 0) {
		return (
			<div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
				<p className="text-muted-foreground font-medium">
					No tasks on this page.
				</p>
				<p className="text-muted-foreground text-sm mt-1">
					Add tasks below to get started.
				</p>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-auto">
			<ul className="divide-y divide-border">
				{tasks.map((task) => (
					<TaskRow
						key={task.id}
						task={task}
						isWorking={task.id === workingTaskId}
						onStart={handleStart}
						onDone={handleDone}
						onReenter={handleReenter}
						onDelete={handleDelete}
						onUpdateText={handleUpdateText}
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDragEnd={handleDragEnd}
						isDragging={draggedTask?.id === task.id}
						isDropTarget={dropTargetId === task.id}
						disabled={!!loadingTaskId || !!workingTaskId || isReordering}
					/>
				))}
			</ul>
		</div>
	);
}
