"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { GripVertical, Play, Check, RefreshCw, Trash2 } from "lucide-react";
import type { Task } from "@/lib/types";
import {
	startTask,
	deleteTask,
	reenterTask,
	markTaskDone,
	updateTask,
	reorderTasks,
	getNextPosition,
} from "@/lib/store";
import { formatTimeCompact } from "./timer-bar";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface TaskListProps {
	tasks: Task[];
	allTasks: Task[]; // All active tasks for cross-page reordering
	workingTaskId: string | null;
	onRefresh: () => void;
	pageSize: number;
	onStartTask: (taskId: string) => void;
	onDoneTask: (taskId: string) => void;
	onDeleteTask: (taskId: string) => void;
	onReorderTasks: (
		draggedTaskId: string,
		dropTargetId: string,
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
	onTouchStart: (e: React.TouchEvent, task: Task) => void;
	onTouchMove: (e: React.TouchEvent) => void;
	onTouchEnd: () => void;
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
	onTouchStart,
	onTouchMove,
	onTouchEnd,
	isDragging,
	isDropTarget,
	disabled,
}: TaskRowProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editText, setEditText] = useState(task.text);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [modalEditText, setModalEditText] = useState(task.text);
	const inputRef = useRef<HTMLInputElement>(null);
	const spanRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	const isTextOverflowing = () => {
		if (!spanRef.current) return false;
		return spanRef.current.scrollWidth > spanRef.current.clientWidth;
	};

	const handleTextClick = (e: React.MouseEvent) => {
		if (isWorking) return;
		e.stopPropagation();

		if (isTextOverflowing()) {
			setModalEditText(task.text);
			setShowModal(true);
		} else {
			setEditText(task.text);
			setIsEditing(true);
		}
	};

	const handleModalSave = () => {
		const trimmed = modalEditText.trim();
		if (trimmed && trimmed !== task.text) {
			onUpdateText(task.id, trimmed);
		}
		setShowModal(false);
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
		<>
			<li
				data-task-id={task.id}
				draggable={!isWorking && !isEditing && !disabled}
				onDragStart={(e) => onDragStart(e, task)}
				onDragOver={(e) => onDragOver(e, task)}
				onDragEnd={onDragEnd}
				onTouchStart={(e) => onTouchStart(e, task)}
				onTouchMove={onTouchMove}
				onTouchEnd={onTouchEnd}
				className={`
					group px-4 py-2.5 flex items-center gap-2
					touch-none
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

				{/* Task text - clickable area to edit task */}
				<div className="flex-1 min-w-0 flex items-center gap-2">
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
							ref={spanRef}
							onClick={handleTextClick}
							className={`
								truncate cursor-text
								${isWorking ? "text-[#ddd4b8]" : ""}
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
						<div className="flex items-center gap-1 flex-shrink-0">
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

			{/* Modal for editing long text */}
			<Dialog open={showModal} onOpenChange={setShowModal}>
				<DialogContent className="sm:max-w-[500px] top-[20%] sm:top-[50%] translate-y-[-20%] sm:translate-y-[-50%]">
					<DialogHeader>
						<DialogTitle>Edit Task</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 pt-4">
						<textarea
							value={modalEditText}
							onChange={(e) => setModalEditText(e.target.value)}
							className="w-full min-h-[120px] bg-transparent border border-[#8b9a6b] rounded-md p-3 outline-none text-foreground resize-none"
							autoFocus
							onKeyDown={(e) => {
								if (e.key === "Enter" && e.ctrlKey) {
									handleModalSave();
								} else if (e.key === "Escape") {
									setShowModal(false);
								}
							}}
						/>
						<div className="flex justify-end gap-2">
							<button
								onClick={() => setShowModal(false)}
								className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={handleModalSave}
								className="px-4 py-2 text-sm bg-[#8b9a6b] text-background hover:bg-[#8b9a6b]/90 rounded transition-colors"
							>
								Save
							</button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
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
	const [touchStartY, setTouchStartY] = useState<number | null>(null);
	const [touchCurrentY, setTouchCurrentY] = useState<number | null>(null);

	const handleStart = useCallback(
		async (task: Task) => {
			if (loadingTaskId || workingTaskId) return;
			setLoadingTaskId(task.id);
			try {
				await startTask(task.id);
				onRefresh();
			} finally {
				setLoadingTaskId(null);
			}
		},
		[loadingTaskId, workingTaskId, onRefresh],
	);

	const handleDone = useCallback(
		async (task: Task) => {
			if (loadingTaskId) return;
			setLoadingTaskId(task.id);
			try {
				await markTaskDone(task.id, task.total_time_ms);
				onRefresh();
			} finally {
				setLoadingTaskId(null);
			}
		},
		[loadingTaskId, onRefresh],
	);

	const handleReenter = useCallback(
		async (task: Task) => {
			if (loadingTaskId) return;
			setLoadingTaskId(task.id);
			try {
				const maxPage = Math.max(...allTasks.map((t) => t.page_number), 1);
				const position = await getNextPosition(maxPage);
				await reenterTask(task.id, task.text, maxPage, position);
				// Mark original as completed
				await markTaskDone(task.id, task.total_time_ms);
				onRefresh();
			} finally {
				setLoadingTaskId(null);
			}
		},
		[loadingTaskId, allTasks, onRefresh],
	);

	const handleDelete = useCallback(
		async (taskId: string) => {
			if (loadingTaskId) return;
			setLoadingTaskId(taskId);
			try {
				await deleteTask(taskId);
				onRefresh();
			} finally {
				setLoadingTaskId(null);
			}
		},
		[loadingTaskId, onRefresh],
	);

	const handleUpdateText = useCallback(
		async (taskId: string, newText: string) => {
			try {
				await updateTask(taskId, { text: newText });
				onRefresh();
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
			await onReorderTasks(draggedTask.id, dropTargetId);
		} catch (error) {
			console.error("Failed to reorder tasks:", error);
		}

		setDraggedTask(null);
		setDropTargetId(null);
	}, [draggedTask, dropTargetId, onReorderTasks]);

	const handleTouchStart = useCallback(
		(e: React.TouchEvent, task: Task) => {
			if (workingTaskId || loadingTaskId) return;
			setDraggedTask(task);
			setTouchStartY(e.touches[0].clientY);
		},
		[workingTaskId, loadingTaskId],
	);

	const handleTouchMove = useCallback(
		(e: React.TouchEvent) => {
			if (!draggedTask || !touchStartY) return;
			setTouchCurrentY(e.touches[0].clientY);

			// Find the element at the touch position
			const touch = e.touches[0];
			const elementAtPoint = document.elementFromPoint(
				touch.clientX,
				touch.clientY,
			);
			const taskRow = elementAtPoint?.closest("li");
			const taskId = taskRow?.getAttribute("data-task-id");

			if (taskId && taskId !== draggedTask.id) {
				setDropTargetId(taskId);
			}
		},
		[draggedTask, touchStartY],
	);

	const handleTouchEnd = useCallback(async () => {
		if (!draggedTask || !dropTargetId) {
			setDraggedTask(null);
			setDropTargetId(null);
			setTouchStartY(null);
			setTouchCurrentY(null);
			return;
		}

		try {
			await onReorderTasks(draggedTask.id, dropTargetId);
		} catch (error) {
			console.error("Failed to reorder tasks:", error);
		}

		setDraggedTask(null);
		setDropTargetId(null);
		setTouchStartY(null);
		setTouchCurrentY(null);
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
						onTouchStart={handleTouchStart}
						onTouchMove={handleTouchMove}
						onTouchEnd={handleTouchEnd}
						isDragging={draggedTask?.id === task.id}
						isDropTarget={dropTargetId === task.id}
						disabled={!!loadingTaskId || !!workingTaskId}
					/>
				))}
			</ul>
		</div>
	);
}
