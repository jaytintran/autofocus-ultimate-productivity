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
import type { Task } from "@/lib/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { TagPill } from "@/components/shared/tag-pill";
import type { TagId } from "@/lib/tags";
import { TaskContextMenu } from "@/components/views/tasks/task-list/task-context-menu";
import { useLongPress } from "@/hooks/ui/use-long-press";
import { DueDatePicker } from "@/components/shared/due-date-picker";
import { useSwipeReveal } from "./use-swipe-reveal";
import { useIsMobile } from "./use-is-mobile";
import type { TaskRowProps } from "./task-list-types";

/**
 * Individual task row with inline editing, swipe actions, and context menu.
 * Memoized to prevent re-render when other rows change state.
 */
export const TaskRow = memo(function TaskRow({
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
