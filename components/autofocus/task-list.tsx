"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { GripVertical, Play, Check, RefreshCw, Trash2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { updateTask } from "@/lib/store";
import { formatTimeCompact } from "./timer-bar";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
	arrayMove,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TagPicker } from "./tag-picker";
import { TagPill } from "./tag-pill";
import { TagFilter } from "./tag-filter";
import { updateTaskTag } from "@/lib/store";
import type { TagId } from "@/lib/tags";

interface TaskListProps {
	tasks: Task[];
	allTasks: Task[]; // All active tasks for cross-page reordering
	workingTaskId: string | null;
	selectedTags: Set<TagId | "none">;
	onRefresh: () => void;
	onStartTask: (task: Task) => Promise<void>;
	onDoneTask: (task: Task) => Promise<void>;
	onDeleteTask: (taskId: string) => Promise<void>;
	onReenterTask: (task: Task) => Promise<void>;
	onReorderTasks: (
		draggedTaskId: string,
		dropTargetId: string,
	) => Promise<void>;
	onSwitchTask: (
		newTask: Task,
		action: "complete" | "reenter",
	) => Promise<void>;
	onVisibleCapacityChange?: (capacity: number) => void;
}

const FALLBACK_TASK_ROW_HEIGHT = 48;

interface TaskRowProps {
	task: Task;
	isWorking: boolean;
	workingTask: Task | null;
	onStart: (task: Task) => void;
	onDone: (task: Task) => void;
	onReenter: (task: Task) => void;
	onDelete: (taskId: string) => void;
	onUpdateText: (taskId: string, newText: string) => void;
	onUpdateTag: (taskId: string, tag: TagId | null) => void;
	onSwitchTask: (
		newTask: Task,
		action: "complete" | "reenter",
	) => Promise<void>;
	disabled: boolean;
	isDragOverlay?: boolean;
}

function TaskRow({
	task,
	isWorking,
	workingTask,
	onStart,
	onDone,
	onReenter,
	onDelete,
	onUpdateText,
	onUpdateTag,
	onSwitchTask,
	disabled,
	isDragOverlay = false,
}: TaskRowProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editText, setEditText] = useState(task.text);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [modalEditText, setModalEditText] = useState(task.text);
	const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
	const [pendingTask, setPendingTask] = useState<Task | null>(null);

	const spanRef = useRef<HTMLSpanElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const reenterButtonRef = useRef<HTMLButtonElement>(null);

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: task.id,
		disabled: isWorking || isEditing || disabled,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	useEffect(() => {
		if (showSwitchConfirm) {
			reenterButtonRef.current?.focus();
		}
	}, [showSwitchConfirm]);

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

	const handleStartClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (workingTask && workingTask.id !== task.id) {
			setPendingTask(task);
			setShowSwitchConfirm(true);
		} else {
			onStart(task);
		}
	};

	const handleSwitchComplete = async () => {
		setShowSwitchConfirm(false);
		if (pendingTask) {
			await onSwitchTask(pendingTask, "complete");
			setPendingTask(null);
		}
	};

	const handleSwitchReenter = async () => {
		setShowSwitchConfirm(false);
		if (pendingTask) {
			await onSwitchTask(pendingTask, "reenter");
			setPendingTask(null);
		}
	};

	return (
		<>
			<li
				ref={setNodeRef}
				style={style}
				data-task-id={task.id}
				className={`
					group relative flex items-center gap-2 px-3 py-2.5
					${isWorking ? "bg-[#8b9a6b]/5" : "hover:bg-accent/50"}
					${isDragOverlay ? "shadow-lg bg-background border border-border rounded-md" : ""}
					transition-colors
				`}
			>
				{/* Drag handle */}
				{!isWorking && !isEditing && !isDragOverlay && (
					<button
						{...attributes}
						{...listeners}
						type="button"
						className="cursor-grab active:cursor-grabbing p-1 -ml-1 touch-none select-none"
						aria-label="Drag to reorder"
					>
						<GripVertical className="w-4 h-4 text-muted-foreground pointer-events-none" />
					</button>
				)}

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

					{/* Tag pill - shown before action buttons */}
					{task.tag && !isEditing && (
						<TagPill
							tagId={task.tag}
							onClick={() => !disabled && setShowModal(true)}
						/>
					)}

					{/* Action buttons */}
					{!isWorking && !isEditing && (
						<div className="flex items-center gap-1 flex-shrink-0">
							{/* Start button */}
							<button
								onClick={handleStartClick}
								className="p-1.5 hover:bg-accent rounded transition-colors"
								title="Start working on this task"
							>
								<Play className="w-3.5 h-3.5 text-[#8b9a6b]" />
							</button>

							{/* Tag picker */}
							<TagPicker
								currentTag={task.tag}
								onSelectTag={(tag) => onUpdateTag(task.id, tag)}
								disabled={disabled}
							/>

							{/* Done button */}
							<button
								onClick={(e) => {
									e.stopPropagation();
									onDone(task);
								}}
								className="p-1.5 hover:bg-accent rounded transition-colors"
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
								className="p-1.5 hover:bg-accent rounded transition-colors"
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
									className="p-1.5 hover:bg-accent rounded transition-colors"
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

			{/* Switch task confirmation dialog */}
			<Dialog open={showSwitchConfirm} onOpenChange={setShowSwitchConfirm}>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Switch Tasks?</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						You're currently working on "{workingTask?.text}". What would you
						like to do with it?
					</p>
					<div className="flex gap-2 justify-end mt-4">
						<button
							type="button"
							onClick={() => setShowSwitchConfirm(false)}
							disabled={disabled}
							className="px-4 py-2 text-sm border rounded hover:bg-accent transition-colors"
						>
							Cancel
						</button>
						<button
							ref={reenterButtonRef}
							type="button"
							onClick={() => void handleSwitchReenter()}
							disabled={disabled}
							className="px-4 py-2 text-sm bg-[#c49a6b] text-white rounded hover:bg-[#c49a6b]/90 transition-colors"
						>
							Re-enter at End
						</button>
						<button
							type="button"
							onClick={() => void handleSwitchComplete()}
							disabled={disabled}
							className="px-4 py-2 text-sm bg-[#8b9a6b] text-white rounded hover:bg-[#8b9a6b]/90 transition-colors"
						>
							Mark as Completed
						</button>
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
	selectedTags,
	onRefresh,
	onStartTask,
	onDoneTask,
	onDeleteTask,
	onReenterTask,
	onReorderTasks,
	onSwitchTask,
	onVisibleCapacityChange,
}: TaskListProps) {
	const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLUListElement>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 5,
			},
		}),
		useSensor(TouchSensor, {
			activationConstraint: {
				delay: 150,
				tolerance: 5,
			},
		}),
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

	const handleUpdateTag = useCallback(
		async (taskId: string, tag: TagId | null) => {
			if (loadingTaskId) return;
			setLoadingTaskId(taskId);
			try {
				await updateTaskTag(taskId, tag);
				await onRefresh();
			} finally {
				setLoadingTaskId(null);
			}
		},
		[loadingTaskId, onRefresh],
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

	const activeTask = activeId ? allTasks.find((t) => t.id === activeId) : null;
	const workingTask = workingTaskId
		? allTasks.find((t) => t.id === workingTaskId)
		: null;

	useEffect(() => {
		if (!onVisibleCapacityChange) return;

		const calculateVisibleCapacity = () => {
			const container = containerRef.current;
			if (!container) return;

			const firstTaskRow =
				listRef.current?.querySelector<HTMLLIElement>("li[data-task-id]");
			const rowHeight =
				firstTaskRow?.getBoundingClientRect().height ||
				FALLBACK_TASK_ROW_HEIGHT;
			const capacity = Math.max(
				1,
				Math.floor(container.clientHeight / Math.max(rowHeight, 1)),
			);

			onVisibleCapacityChange(capacity);
		};

		calculateVisibleCapacity();

		if (typeof ResizeObserver === "undefined") {
			return;
		}

		const observer = new ResizeObserver(calculateVisibleCapacity);
		if (containerRef.current) {
			observer.observe(containerRef.current);
		}

		const firstTaskRow = listRef.current?.querySelector("li[data-task-id]");
		if (firstTaskRow) {
			observer.observe(firstTaskRow);
		}

		return () => observer.disconnect();
	}, [tasks, onVisibleCapacityChange]);

	const handleStart = useCallback(
		async (task: Task) => {
			if (loadingTaskId) return;
			setLoadingTaskId(task.id);
			try {
				await onStartTask(task);
			} finally {
				setLoadingTaskId(null);
			}
		},
		[loadingTaskId, onStartTask],
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
				await onReenterTask(task);
			} finally {
				setLoadingTaskId(null);
			}
		},
		[loadingTaskId, onReenterTask],
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
				onRefresh();
			} catch (error) {
				console.error("Failed to update task text:", error);
			}
		},
		[onRefresh],
	);

	const handleSwitchTask = useCallback(
		async (newTask: Task, action: "complete" | "reenter") => {
			if (loadingTaskId) return;
			setLoadingTaskId(newTask.id);
			try {
				await onSwitchTask(newTask, action);
			} finally {
				setLoadingTaskId(null);
			}
		},
		[loadingTaskId, onSwitchTask],
	);

	return (
		<div ref={containerRef} className="flex-1 flex flex-col min-h-0">
			<div className="flex-1 overflow-y-auto">
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
							{filteredTasks.map((task) => (
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
									disabled={!!loadingTaskId}
								/>
							))}
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
							/>
						)}
					</DragOverlay>
				</DndContext>
			</div>
		</div>
	);
}
