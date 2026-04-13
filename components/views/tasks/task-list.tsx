"use client";

import { useState, useCallback, useMemo, useRef, useEffect, memo } from "react";
import {
	GripVertical,
	Play,
	Check,
	RefreshCw,
	Trash2,
	ClockAlert,
	History,
} from "lucide-react";
import type { Pamphlet, Task } from "@/lib/types";
import { updateTask } from "@/lib/db/store-v1";
import {
	formatTimeCompact,
	getTaskAge,
	formatDueDateVerbose,
} from "@/lib/utils/time-utils";
import {
	formatDueDate,
	parseDueDateShortcut,
} from "@/lib/utils/due-date-parser";
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
import { TagPill } from "@/components/shared/tag-pill";
import { TagFilter } from "@/components/shared/tag-filter";
import { updateTaskTag } from "@/lib/db/store-v1";
import type { TagId } from "@/lib/tags";
import { TaskContextMenu } from "@/components/views/tasks/task-context-menu";
import { useLongPress } from "@/hooks/ui/use-long-press";
import { DueDatePicker } from "@/components/shared/due-date-picker";

// =============================================================================
// TYPES
// =============================================================================

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
	disableSwipeForWorkingTask?: boolean;
	pamphlets: Pamphlet[];
	activePamphletId: string | null;
	onMoveTask: (taskId: string, toPamphletId: string) => void;
	onUpdateDueDate: (taskId: string, dueDate: string | null) => Promise<void>;
	onUpdateText?: (taskId: string, text: string) => Promise<void>;
}

interface TaskRowProps {
	task: Task;
	isWorking: boolean;
	workingTask: Task | null;
	onStart: (task: Task) => void;
	onDone: (task: Task) => void;
	onReenter: (task: Task) => void;
	onDelete: (taskId: string) => void;
	onUpdateText: (
		taskId: string,
		newText: string,
		dueDate?: string | null,
	) => void;
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
	disableSwipe?: boolean;
	pamphlets: Pamphlet[];
	activePamphletId: string | null;
	onMoveTask: (taskId: string, toPamphletId: string) => void;
	onUpdateDueDate: (taskId: string, dueDate: string | null) => Promise<void>;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Detect mobile viewport for conditional swipe/behavior */
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

/** Play a subtle completion sound effect */
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

// =============================================================================
// SWIPE REVEAL HOOK
// =============================================================================

/**
 * Manages swipe-to-reveal action trays on mobile.
 * Uses direct DOM manipulation for 60fps performance during drag,
 * with React state sync for snap animations.
 */
function useSwipeReveal(isFirst: boolean, isLast: boolean) {
	const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(
		null,
	);
	const [committedOffset, setCommittedOffset] = useState(0);
	const startXRef = useRef<number | null>(null);
	const startYRef = useRef<number | null>(null);
	const isEdgeSwipeRef = useRef(false);
	const slidingRef = useRef<HTMLDivElement | null>(null);

	const LEFT_TRAY_WIDTH = isFirst ? 96 : 144;
	const RIGHT_TRAY_WIDTH = isLast ? 96 : 144;
	const EDGE_THRESHOLD = 180;

	/** Update transform directly for smooth 60fps dragging */
	const updateLivePosition = useCallback((offset: number) => {
		if (slidingRef.current) {
			slidingRef.current.style.transform = `translateX(${offset}px)`;
			slidingRef.current.style.transition = "none";
		}
	}, []);

	const onTouchStart = useCallback(
		(e: React.TouchEvent) => {
			const touch = e.touches[0];
			const rect = e.currentTarget.getBoundingClientRect();
			const touchXRelative = touch.clientX - rect.left;

			isEdgeSwipeRef.current =
				touchXRelative < EDGE_THRESHOLD ||
				touchXRelative > rect.width - EDGE_THRESHOLD;

			if (!isEdgeSwipeRef.current) {
				startXRef.current = null;
				startYRef.current = null;
				return;
			}

			startXRef.current = touch.clientX;
			startYRef.current = touch.clientY;
			updateLivePosition(committedOffset);
		},
		[committedOffset, updateLivePosition],
	);

	const onTouchMove = useCallback(
		(e: React.TouchEvent) => {
			if (
				!isEdgeSwipeRef.current ||
				startXRef.current === null ||
				startYRef.current === null
			) {
				return;
			}

			const diffX = startXRef.current - e.touches[0].clientX;
			const diffY = Math.abs(startYRef.current - e.touches[0].clientY);

			if (Math.abs(diffX) < diffY + 15) return;

			let newOffset = -diffX;

			if (swipeDirection === "left" || (!swipeDirection && newOffset < 0)) {
				newOffset = Math.max(-LEFT_TRAY_WIDTH, Math.min(0, newOffset));
			} else if (
				swipeDirection === "right" ||
				(!swipeDirection && newOffset > 0)
			) {
				newOffset = Math.min(RIGHT_TRAY_WIDTH, Math.max(0, newOffset));
			}

			updateLivePosition(newOffset);
		},
		[swipeDirection, LEFT_TRAY_WIDTH, RIGHT_TRAY_WIDTH, updateLivePosition],
	);

	const onTouchEnd = useCallback(
		(e: React.TouchEvent) => {
			if (!isEdgeSwipeRef.current || startXRef.current === null) {
				isEdgeSwipeRef.current = false;
				return;
			}

			const diffX = startXRef.current - e.changedTouches[0].clientX;
			const diffY = Math.abs(startYRef.current! - e.changedTouches[0].clientY);
			const isMostlyHorizontal = Math.abs(diffX) > diffY + 25;

			let finalDirection: "left" | "right" | null = null;
			let finalOffset = 0;

			if (isMostlyHorizontal) {
				if (diffX > 55) {
					finalDirection = "left";
					finalOffset = -LEFT_TRAY_WIDTH;
				} else if (diffX < -55) {
					finalDirection = "right";
					finalOffset = RIGHT_TRAY_WIDTH;
				}
			}

			setSwipeDirection(finalDirection);
			setCommittedOffset(finalOffset);

			if (slidingRef.current) {
				slidingRef.current.style.transition =
					"transform 180ms cubic-bezier(0.25, 0.1, 0.25, 1)";
				slidingRef.current.style.transform = `translateX(${finalOffset}px)`;
			}

			startXRef.current = null;
			startYRef.current = null;
			isEdgeSwipeRef.current = false;
		},
		[LEFT_TRAY_WIDTH, RIGHT_TRAY_WIDTH],
	);

	const close = useCallback(() => {
		setSwipeDirection(null);
		setCommittedOffset(0);
		if (slidingRef.current) {
			slidingRef.current.style.transition =
				"transform 180ms cubic-bezier(0.25, 0.1, 0.25, 1)";
			slidingRef.current.style.transform = "translateX(0px)";
		}
	}, []);

	const registerSlidingElement = useCallback((el: HTMLDivElement | null) => {
		slidingRef.current = el;
		if (el) {
			el.style.transform = "translateX(0px)";
		}
	}, []);

	return {
		swipedLeft: swipeDirection === "left",
		swipedRight: swipeDirection === "right",
		dragOffset: committedOffset,
		isDragging: startXRef.current !== null,
		onTouchStart,
		onTouchMove,
		onTouchEnd,
		close,
		registerSlidingElement,
	};
}

// =============================================================================
// TASK ROW COMPONENT (MEMOIZED)
// =============================================================================

/**
 * Individual task row with inline editing, swipe actions, and context menu.
 * Memoized to prevent re-render when other rows change state.
 */
const TaskRow = memo(function TaskRow({
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
	disableSwipe,
	pamphlets,
	activePamphletId,
	onMoveTask,
	onUpdateDueDate,
}: TaskRowProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editText, setEditText] = useState(task.text);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
	const [pendingTask, setPendingTask] = useState<Task | null>(null);
	const [contextMenu, setContextMenu] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [dueDatePickerOpen, setDueDatePickerOpen] = useState(false);

	const inputRef = useRef<HTMLTextAreaElement>(null);
	const reenterButtonRef = useRef<HTMLButtonElement>(null);
	const isMobile = useIsMobile();

	const {
		swipedLeft,
		swipedRight,
		onTouchStart,
		onTouchMove,
		onTouchEnd,
		close,
		registerSlidingElement,
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

	// Sync edit text when task changes externally
	useEffect(() => {
		setEditText(task.text);
	}, [task.text]);

	// Auto-focus and select when entering edit mode
	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	// Close due date picker when entering edit mode
	useEffect(() => {
		if (isEditing) {
			setDueDatePickerOpen(false);
		}
	}, [isEditing]);

	// Auto-resize textarea
	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.style.height = "auto";
			inputRef.current.style.height = inputRef.current.scrollHeight + "px";
		}
	}, [isEditing, editText]);

	// Focus reenter button when switch dialog opens
	useEffect(() => {
		if (showSwitchConfirm) {
			reenterButtonRef.current?.focus();
		}
	}, [showSwitchConfirm]);

	const handleTextClick = useCallback(
		(e: React.MouseEvent) => {
			if (isWorking || isMobile) return; // Disable inline edit on mobile
			e.stopPropagation();
			setEditText(task.text);
			setIsEditing(true);
		},
		[isWorking, isMobile, task.text],
	);

	const handleSave = useCallback(() => {
		const trimmed = editText.trim();
		if (!trimmed) {
			setIsEditing(false);
			return;
		}
		const { cleanText, dueDate } = parseDueDateShortcut(trimmed);
		const finalText = cleanText || trimmed;
		if (finalText !== task.text || dueDate !== null) {
			onUpdateText(
				task.id,
				finalText,
				dueDate ? dueDate.toISOString() : undefined,
			);
		}
		setIsEditing(false);
	}, [editText, task.id, task.text, onUpdateText]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSave();
			} else if (e.key === "Escape") {
				setEditText(task.text);
				setIsEditing(false);
			}
		},
		[handleSave, task.text],
	);

	const handleDeleteClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			if (showDeleteConfirm) {
				onDelete(task.id);
				setShowDeleteConfirm(false);
			} else {
				setShowDeleteConfirm(true);
				setTimeout(() => setShowDeleteConfirm(false), 3000);
			}
		},
		[showDeleteConfirm, task.id, onDelete],
	);

	const handleStartClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			if (workingTask && workingTask.id !== task.id) {
				setPendingTask(task);
				setShowSwitchConfirm(true);
			} else {
				onStart(task);
			}
		},
		[workingTask, task, onStart],
	);

	const handleSwitchComplete = useCallback(async () => {
		setShowSwitchConfirm(false);
		if (pendingTask) {
			await onSwitchTask(pendingTask, "complete");
			setPendingTask(null);
		}
	}, [pendingTask, onSwitchTask]);

	const handleSwitchReenter = useCallback(async () => {
		setShowSwitchConfirm(false);
		if (pendingTask) {
			await onSwitchTask(pendingTask, "reenter");
			setPendingTask(null);
		}
	}, [pendingTask, onSwitchTask]);

	const handleContextMenu = useCallback(
		(e: React.MouseEvent) => {
			if (isDragging) return; // Don't show context menu while dragging
			e.preventDefault();
			e.stopPropagation();
			setContextMenu({ x: e.clientX, y: e.clientY });
		},
		[isDragging],
	);

	const handleEnableEdit = useCallback(() => {
		setEditText(task.text);
		setIsEditing(true);
	}, [task.text]);

	const {
		onTouchStart: lpStart,
		onTouchEnd: lpEnd,
		onTouchMove: lpMove,
		isDragging: isLongPressDragging,
	} = useLongPress({
		onLongPress: (e) => {
			if (isEditing || isDragging) return; // Don't trigger long press while dragging
			const touch = e.touches[0];
			setContextMenu({ x: touch.clientX, y: touch.clientY });
		},
		delay: 1000,
	});

	const shouldDisableSwipe = disableSwipe || isWorking;

	// Close swipe tray when task becomes working
	useEffect(() => {
		if (isWorking) {
			close();
		}
	}, [isWorking, close]);

	// Due date urgency styling
	const dueDateClasses = useMemo(() => {
		if (!task.due_date) return "";
		const { urgency } = formatDueDate(task.due_date);
		return {
			overdue: "border-red-500/40 bg-red-500/10 text-red-500",
			soon: "border-amber-500/40 bg-amber-500/10 text-amber-500",
			normal: "border-muted-foreground/30 bg-muted/50 text-muted-foreground",
			far: "border-muted-foreground/20 bg-transparent text-muted-foreground/50",
		}[urgency];
	}, [task.due_date]);

	return (
		<>
			<li
				ref={setNodeRef}
				style={style}
				data-task-id={task.id}
				className={`
					group relative flex select-none
					${isWorking ? "bg-[#8b9a6b]/5 ring-1 ring-inset ring-[#8b9a6b]/30" : ""}
					${isDragOverlay ? "shadow-lg bg-background border border-border rounded-md" : ""}
					transition-colors overflow-hidden
				`}
				onContextMenu={handleContextMenu}
				onTouchStart={(e) => {
					if (!isDragging) {
						lpStart(e);
						if (isMobile && !shouldDisableSwipe) onTouchStart(e);
					}
				}}
				onTouchMove={(e) => {
					if (!isDragging) {
						lpMove(e);
						if (isMobile && !shouldDisableSwipe) onTouchMove(e);
					}
				}}
				onTouchEnd={(e) => {
					if (!isDragging) {
						lpEnd(e);
						if (isMobile && !shouldDisableSwipe) onTouchEnd(e);
					}
				}}
			>
				{/* Sliding content wrapper */}
				<div
					ref={registerSlidingElement}
					className="relative flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-3 sm:py-2.5 w-full bg-background touch-pan-y"
					style={{ zIndex: 1 }}
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
					{/* Top row: Drag handle + Task text */}
					<div className="flex items-center gap-2 flex-1 min-w-0">
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

						{/* Task text / Edit input */}
						<div className="flex-1 min-w-0 flex items-center gap-2">
							{isEditing ? (
								<div className="flex-1 flex items-center gap-2 min-w-0">
									<textarea
										ref={inputRef}
										value={editText}
										onChange={(e) => setEditText(e.target.value)}
										onBlur={handleSave}
										onKeyDown={handleKeyDown}
										placeholder="Task text… or append !1d, !2h, !30m"
										onClick={(e) => e.stopPropagation()}
										className="flex-1 bg-transparent border-b border-[#8b9a6b] outline-none py-0.5 text-foreground resize-none w-full"
									/>
									{(() => {
										const { dueDate } = parseDueDateShortcut(editText);
										return dueDate ? (
											<span className="text-xs sm:text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-500 flex-shrink-0">
												⏰ {parseDueDateShortcut(editText).dueDateLabel}
											</span>
										) : null;
									})()}
								</div>
							) : (
								<span
									onClick={handleTextClick}
									className={`wrap-break-word min-w-0 w-full cursor-text ${isWorking ? "text-[#ddd4b8]" : ""}`}
								>
									{task.text}
								</span>
							)}
						</div>
					</div>

					{/* Bottom row (mobile) / Right side (desktop): Badges and actions */}
					<div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
						{/* Re-entered badge */}
						{task.re_entered_from && !isEditing && (
							<span className="text-xs sm:text-[10px] px-1.5 py-0.5 rounded border border-[#c49a6b]/40 bg-[#c49a6b]/10 text-[#c49a6b] flex-shrink-0">
								<RefreshCw className="w-3 sm:w-2.5 h-3 sm:h-2.5" />
							</span>
						)}

						{/* Due date badge - now visible on mobile */}
						{!isEditing && !isWorking && (
							<div className="relative flex-shrink-0">
								<button
									onClick={(e) => {
										e.stopPropagation();
										setDueDatePickerOpen((prev) => !prev);
									}}
									className={`text-xs sm:text-[10px] px-1.5 py-0.5 rounded border transition-colors flex-shrink-0 ${
										task.due_date
											? dueDateClasses
											: "border-dashed border-muted-foreground/20 text-muted-foreground/30 hover:border-muted-foreground/50 hover:text-muted-foreground/60"
									}`}
									title={
										task.due_date
											? formatDueDateVerbose(task.due_date)
											: "Set due date"
									}
								>
									{task.due_date ? (
										formatDueDate(task.due_date).label
									) : (
										<ClockAlert className="w-3.5 sm:w-3 h-3.5 sm:h-3" />
									)}
								</button>

								{dueDatePickerOpen && (
									<DueDatePicker
										currentDueDate={task.due_date}
										onSet={(isoDate) => {
											onUpdateDueDate(task.id, isoDate);
											setDueDatePickerOpen(false);
										}}
										onClose={() => setDueDatePickerOpen(false)}
									/>
								)}
							</div>
						)}

						{/* Time logged badge */}
						{task.total_time_ms > 0 && !isEditing && (
							<span className="text-xs sm:text-[10px] px-1.5 py-0.5 rounded border border-muted-foreground/30 bg-muted/50 text-muted-foreground flex-shrink-0">
								{formatTimeCompact(task.total_time_ms)}
							</span>
						)}

						{/* Age badge - hidden on mobile */}
						{!isEditing && (
							<div className="hidden sm:flex items-center justify-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border border-muted-foreground/20 bg-transparent text-muted-foreground/50 flex-shrink-0">
								<History className="w-3 h-3" />
								<span>{getTaskAge(task.added_at)}</span>
							</div>
						)}

						{/* Tag pill */}
						<TagPill
							tagId={task.tag}
							onSelectTag={(tag) => !disabled && onUpdateTag(task.id, tag)}
							disabled={disabled || isEditing || isWorking}
						/>

						{/* Desktop action buttons */}
						{!isMobile && !isWorking && !isEditing && (
							<div className="flex items-center gap-1 flex-shrink-0">
								<button
									onClick={handleStartClick}
									className="p-1.5 hover:bg-accent rounded transition-colors"
									title="Start working on this task"
								>
									<Play className="w-3.5 h-3.5 text-[#8b9a6b]" />
								</button>

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

				{/* Mobile left tray (swipe left to reveal: re-enter, pump, delete) */}
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

				{/* Mobile right tray (swipe right to reveal: start, complete, sink) */}
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

			{/* Context menu */}
			{contextMenu && (
				<TaskContextMenu
					task={task}
					position={contextMenu}
					isFirst={isFirst}
					isLast={isLast}
					pamphlets={pamphlets}
					activePamphletId={activePamphletId}
					onClose={() => setContextMenu(null)}
					onStart={onStart}
					onDone={onDone}
					onReenter={onReenter}
					onDelete={onDelete}
					onPump={onPumpTask}
					onSink={onSinkTask}
					onUpdateTag={onUpdateTag}
					onMoveTask={onMoveTask}
					onEdit={isMobile ? handleEnableEdit : undefined}
				/>
			)}

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
});

// =============================================================================
// MAIN TASK LIST COMPONENT
// =============================================================================

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
			activationConstraint: { delay: 100, tolerance: 5 }, // Reduced from 150ms
		}),
	);

	// Memoized filtered tasks - only recalculates when dependencies actually change
	const filteredTasks = useMemo(() => {
		if (selectedTags.size === 0) return tasks;

		return tasks.filter((task) => {
			if (selectedTags.has("none")) {
				return task.tag === null;
			}
			return task.tag && selectedTags.has(task.tag);
		});
	}, [tasks, selectedTags]); // Removed localTasks dependency

	// Stable callback creators using useCallback
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

	// Optimistic due date update - updates UI immediately, syncs in background
	const handleUpdateDueDate = useCallback(
		async (taskId: string, dueDate: string | null) => {
			// Optimistic update could go here if parent supports it
			// For now, just pass through with error handling
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
				// REMOVED: Artificial 300ms delay - no longer needed with optimized store.ts
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
				// Use parent's optimistic update handler
				await onUpdateText(taskId, newText);
				// If there's a due date change, handle it separately
				if (dueDate !== undefined) {
					await onUpdateDueDate(taskId, dueDate);
				}
			} else {
				// Fallback to direct update (shouldn't happen in normal flow)
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

	// Memoized row renderer to prevent unnecessary re-renders
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
