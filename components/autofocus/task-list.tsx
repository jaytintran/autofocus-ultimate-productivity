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

function useIsMobile() {
	const [isMobile, setIsMobile] = useState(false);
	useEffect(() => {
		const check = () => setIsMobile(window.innerWidth < 768);
		check();
		window.addEventListener("resize", check);
		return () => window.removeEventListener("resize", check);
	}, []);
	return isMobile;
}

function useSwipeReveal(isFirst: boolean, isLast: boolean) {
	const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(
		null,
	);
	const [dragOffset, setDragOffset] = useState(0);
	const startXRef = useRef<number | null>(null);
	const LEFT_TRAY_WIDTH = isFirst ? 96 : 144; // re-enter, pump (if not first), delete
	const RIGHT_TRAY_WIDTH = isLast ? 96 : 144; // 3 buttons × 48px (start, complete, sink)

	const onTouchStart = useCallback(
		(e: React.TouchEvent) => {
			startXRef.current = e.touches[0].clientX;
			if (swipeDirection === "left") setDragOffset(-LEFT_TRAY_WIDTH);
			else if (swipeDirection === "right") setDragOffset(RIGHT_TRAY_WIDTH);
			else setDragOffset(0);
		},
		[swipeDirection],
	);

	const onTouchMove = useCallback(
		(e: React.TouchEvent) => {
			if (startXRef.current === null) return;
			const diff = startXRef.current - e.touches[0].clientX;

			if (swipeDirection === "left") {
				const base = -LEFT_TRAY_WIDTH;
				setDragOffset(Math.min(0, Math.max(-LEFT_TRAY_WIDTH, base - diff)));
			} else if (swipeDirection === "right") {
				const base = RIGHT_TRAY_WIDTH;
				setDragOffset(Math.max(0, Math.min(RIGHT_TRAY_WIDTH, base - diff)));
			} else {
				// Not yet committed to a direction
				if (diff > 15) {
					// Swiping left — clamp to left tray
					setDragOffset(Math.min(0, Math.max(-LEFT_TRAY_WIDTH, -diff)));
				} else if (diff < -15) {
					// Swiping right — clamp to right tray
					setDragOffset(Math.max(0, Math.min(RIGHT_TRAY_WIDTH, -diff)));
				}
			}
		},
		[swipeDirection],
	);

	const onTouchEnd = useCallback((e: React.TouchEvent) => {
		if (startXRef.current === null) return;
		const diff = startXRef.current - e.changedTouches[0].clientX;

		if (diff > 60) {
			setSwipeDirection("left");
			setDragOffset(-LEFT_TRAY_WIDTH);
		} else if (diff < -60) {
			setSwipeDirection("right");
			setDragOffset(RIGHT_TRAY_WIDTH);
		} else {
			setSwipeDirection(null);
			setDragOffset(0);
		}
		startXRef.current = null;
	}, []);

	const close = useCallback(() => {
		setSwipeDirection(null);
		setDragOffset(0);
	}, []);

	const isDragging = startXRef.current !== null;
	const swipedLeft = swipeDirection === "left";
	const swipedRight = swipeDirection === "right";

	return {
		swipedLeft,
		swipedRight,
		dragOffset,
		isDragging,
		onTouchStart,
		onTouchMove,
		onTouchEnd,
		close,
	};
}

function getTaskAge(addedAt: string): string {
	const now = new Date();
	const added = new Date(addedAt);
	const diffMs = now.getTime() - added.getTime();
	const diffMins = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	const diffWeeks = Math.floor(diffDays / 7);
	const diffMonths = Math.floor(diffDays / 30);

	if (diffMins < 60) return `${diffMins}m`;
	if (diffHours < 24) return `${diffHours}h`;
	if (diffDays < 7) return `${diffDays}d`;
	if (diffWeeks < 5) return `${diffWeeks}w`;
	return `${diffMonths}mo`;
}

function playCompletionSound() {
	try {
		const ctx = new AudioContext();
		const oscillator = ctx.createOscillator();
		const gain = ctx.createGain();

		oscillator.connect(gain);
		gain.connect(ctx.destination);

		oscillator.type = "sine";
		oscillator.frequency.setValueAtTime(880, ctx.currentTime);
		oscillator.frequency.exponentialRampToValueAtTime(
			1200,
			ctx.currentTime + 0.1,
		);

		gain.gain.setValueAtTime(0.15, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

		oscillator.start(ctx.currentTime);
		oscillator.stop(ctx.currentTime + 0.3);
	} catch {
		// Silently fail if AudioContext is unavailable
	}
}

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
	onPumpTask: (taskId: string) => Promise<void>;
	onSinkTask: (taskId: string) => Promise<void>;
	visibleTotalPages: number;
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
	onPumpTask: (taskId: string) => void;
	onSinkTask: (taskId: string) => void;
	isFirst: boolean;
	isLast: boolean;
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
	onPumpTask,
	isFirst,
	onSinkTask,
	isLast,
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

	const isMobile = useIsMobile();
	const {
		swipedLeft,
		swipedRight,
		dragOffset,
		isDragging: isSwipeDragging,
		onTouchStart,
		onTouchMove,
		onTouchEnd,
		close,
	} = useSwipeReveal(isFirst, isLast);

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
		if (trimmed && trimmed !== task.text) onUpdateText(task.id, trimmed);
		setShowModal(false);
	};

	const handleSave = () => {
		const trimmed = editText.trim();
		if (trimmed && trimmed !== task.text) onUpdateText(task.id, trimmed);
		setIsEditing(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") handleSave();
		else if (e.key === "Escape") {
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
                group relative flex ${isMobile ? "h-[50px]" : null}
                ${isWorking ? "bg-[#8b9a6b]/5" : ""}
                ${isDragOverlay ? "shadow-lg bg-background border border-border rounded-md" : ""}
                transition-colors overflow-hidden
            `}
				onTouchStart={isMobile ? onTouchStart : undefined}
				onTouchMove={isMobile ? onTouchMove : undefined}
				onTouchEnd={isMobile ? onTouchEnd : undefined}
			>
				{/* Sliding wrapper — this moves left to reveal buttons behind it */}
				<div
					className="relative flex items-center gap-2 px-3 py-2.5 w-full bg-background"
					style={{
						transform: isMobile ? `translateX(${dragOffset}px)` : undefined,
						// Only use CSS transition when finger is lifted (snapping), not while dragging
						transition: isSwipeDragging ? "none" : "transform 120ms ease-out",
						zIndex: 1,
					}}
					onTouchEnd={
						isMobile && (swipedLeft || swipedRight)
							? (e) => {
									if (e.cancelable) e.preventDefault();
									e.stopPropagation();
									close();
								}
							: undefined
					}
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

					{/* Task text */}
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

					{/* Right side badges */}
					<div className="flex items-center gap-1.5 flex-shrink-0">
						{task.re_entered_from && !isEditing && (
							<span className="text-[10px] px-1.5 py-0.5 rounded border border-[#c49a6b]/40 bg-[#c49a6b]/10 text-[#c49a6b] flex-shrink-0">
								<RefreshCw className="w-2.5 h-2.5" />
							</span>
						)}
						{task.total_time_ms > 0 && !isEditing && (
							<span className="text-[10px] px-1.5 py-0.5 rounded border border-muted-foreground/30 bg-muted/50 text-muted-foreground flex-shrink-0">
								{formatTimeCompact(task.total_time_ms)}
							</span>
						)}
						{!isEditing && (
							<span className="text-[10px] px-1.5 py-0.5 rounded border border-muted-foreground/20 bg-transparent text-muted-foreground/50 flex-shrink-0">
								{getTaskAge(task.added_at)}
							</span>
						)}

						{/* {task.tag && !isEditing && (
							<TagPill
								tagId={task.tag}
								onClick={() => !disabled && !isMobile && setShowModal(true)}
								className=""
							/>
						)} */}
						<TagPill
							tagId={task.tag}
							onSelectTag={(tag) => !disabled && onUpdateTag(task.id, tag)}
							disabled={disabled || isEditing || isWorking}
						/>

						{/* Desktop action buttons only */}
						{!isMobile && !isWorking && !isEditing && (
							<div className="flex items-center gap-1 flex-shrink-0">
								<button
									onClick={handleStartClick}
									className="p-1.5 hover:bg-accent rounded transition-colors"
									title="Start working on this task"
								>
									<Play className="w-3.5 h-3.5 text-[#8b9a6b]" />
								</button>
								{/* <TagPicker
									currentTag={task.tag}
									onSelectTag={(tag) => onUpdateTag(task.id, tag)}
									disabled={disabled}
								/> */}

								{/* PUMP BUTTON */}
								{!isFirst && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											onPumpTask(task.id);
										}}
										className="p-1.5 hover:bg-accent rounded transition-colors"
										title="Pump to top"
									>
										<svg
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<polyline points="17 11 12 6 7 11" />
											<polyline points="17 18 12 13 7 18" />
										</svg>
									</button>
								)}

								{/* SINK BUTTON */}
								{!isLast && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											onSinkTask(task.id);
										}}
										className="p-1.5 hover:bg-accent rounded transition-colors"
										title="Sink to bottom"
									>
										<svg
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<polyline points="7 13 12 18 17 13" />
											<polyline points="7 6 12 11 17 6" />
										</svg>
									</button>
								)}
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
				</div>

				{/* Mobile action buttons — rendered BEHIND the sliding content, fixed to right edge */}
				{/* Mobile LEFT tray — re-enter, tag, delete (swipe left to reveal) */}
				{isMobile && !isWorking && !isEditing && (
					<div
						className="absolute right-0 top-0 h-full flex items-stretch"
						style={{ zIndex: 0 }}
					>
						<button
							onTouchEnd={(e) => {
								if (e.cancelable) e.preventDefault();
								e.stopPropagation();
								close();
								onReenter(task);
							}}
							className="w-12 flex items-center justify-center bg-[#c49a6b] active:opacity-80"
						>
							<RefreshCw className="w-4 h-4 text-white" />
						</button>

						{!isFirst && (
							<button
								onTouchEnd={(e) => {
									if (e.cancelable) e.preventDefault();
									e.stopPropagation();
									close();
									onPumpTask(task.id);
								}}
								className="w-12 flex items-center justify-center bg-[#6b7fa3] active:opacity-80"
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="white"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<polyline points="17 11 12 6 7 11" />
									<polyline points="17 18 12 13 7 18" />
								</svg>
							</button>
						)}

						<button
							onTouchEnd={(e) => {
								if (e.cancelable) e.preventDefault();
								e.stopPropagation();
								if (showDeleteConfirm) {
									close();
									onDelete(task.id);
									setShowDeleteConfirm(false);
								} else {
									setShowDeleteConfirm(true);
								}
							}}
							className="w-12 flex items-center justify-center bg-destructive active:opacity-80"
						>
							{showDeleteConfirm ? (
								<span className="text-[10px] text-white font-bold">YES</span>
							) : (
								<Trash2 className="w-4 h-4 text-white" />
							)}
						</button>
					</div>
				)}

				{/* Mobile RIGHT tray — start, complete (swipe right to reveal) */}
				{isMobile && !isWorking && !isEditing && (
					<div
						className="absolute left-0 top-0 h-full flex items-stretch"
						style={{ zIndex: 0 }}
					>
						<button
							onTouchEnd={(e) => {
								if (e.cancelable) e.preventDefault();
								e.stopPropagation();
								close();
								handleStartClick(e as any);
							}}
							className="w-12 flex items-center justify-center bg-[#8b9a6b] active:opacity-80"
						>
							<Play className="w-4 h-4 text-white" />
						</button>
						<button
							onTouchEnd={(e) => {
								if (e.cancelable) e.preventDefault();
								e.stopPropagation();
								close();
								onDone(task);
							}}
							className="w-12 flex items-center justify-center bg-[#7a9e7e] active:opacity-80"
						>
							<Check className="w-4 h-4 text-white" />
						</button>
						{/* SINK BUTTON */}
						{!isLast && (
							<button
								onTouchEnd={(e) => {
									if (e.cancelable) e.preventDefault();
									e.stopPropagation();
									close();
									onSinkTask(task.id);
								}}
								className="w-12 flex items-center justify-center bg-[#a36b6b] active:opacity-80"
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="white"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<polyline points="7 13 12 18 17 13" />
									<polyline points="7 6 12 11 17 6" />
								</svg>
							</button>
						)}
					</div>
				)}
			</li>

			{/* Edit modal */}
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
								if (e.key === "Enter" && e.ctrlKey) handleModalSave();
								else if (e.key === "Escape") setShowModal(false);
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

			{/* Switch task dialog */}
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
	onPumpTask,
	onSinkTask,
	visibleTotalPages,
}: TaskListProps) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLUListElement>(null);
	// const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null); (Old)

	const [loadingTaskIds, setLoadingTaskIds] = useState<Set<string>>(new Set());

	const addLoading = (id: string) =>
		setLoadingTaskIds((prev) => new Set(prev).add(id));

	const removeLoading = (id: string) =>
		setLoadingTaskIds((prev) => {
			const next = new Set(prev);
			next.delete(id);
			return next;
		});

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

	/* handleUpdateTagOld
	const handleUpdateTagOld = useCallback(
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
	*/

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
		[loadingTaskIds, onRefresh],
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
		[loadingTaskIds, onPumpTask],
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
		[loadingTaskIds, onSinkTask],
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
		? (allTasks.find((t) => t.id === workingTaskId) ?? null)
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

	/* handleStartOld
	const handleStartOld = useCallback(
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
	 */

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
		[loadingTaskIds, onStartTask],
	);

	/* handleDoneOld
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
	*/

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
		[loadingTaskIds, onDoneTask],
	);

	/* handleReenterOld
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
	*/

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
		[loadingTaskIds, onReenterTask],
	);

	/* handleDeleteOld
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
	*/

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
		[loadingTaskIds, onDeleteTask],
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

	/* handleSwitchTaskOld
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
	*/

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
		[loadingTaskIds, onSwitchTask],
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
							{filteredTasks.map((task, index) => (
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
								onPumpTask={() => {}}
								onSinkTask={() => {}}
								isFirst={false}
								isLast={false}
							/>
						)}
					</DragOverlay>
				</DndContext>
			</div>
		</div>
	);
}
