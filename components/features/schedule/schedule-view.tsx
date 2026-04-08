"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
	DndContext,
	DragEndEvent,
	DragOverlay,
	DragStartEvent,
	PointerSensor,
	useSensor,
	useSensors,
	useDraggable,
	useDroppable,
	pointerWithin,
	TouchSensor,
} from "@dnd-kit/core";

import { format, isSameDay, addMinutes, isToday, addDays } from "date-fns";
import type { Task, TimeBlock } from "@/lib/types";
import {
	GripVertical,
	Plus,
	Clock,
	CheckCircle2,
	Circle,
	ChevronLeft,
	ChevronRight,
	X,
	Play,
	Pencil,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface ScheduleViewProps {
	date: Date;
	timeBlocks: TimeBlock[];
	tasks: Task[];
	completedTasks: Task[];
	onScheduleTask: (taskId: string, scheduledAt: string) => Promise<void>;
	onUnscheduleTask: (taskId: string) => Promise<void>;
	onCreateBlock: (
		block: Omit<TimeBlock, "id" | "user_id" | "created_at" | "updated_at">,
	) => Promise<TimeBlock>;
	onUpdateBlock: (id: string, updates: Partial<TimeBlock>) => Promise<void>;
	onDeleteBlock: (id: string) => Promise<void>;
	onStartTask: (task: Task) => void;
	onDateChange: (date: Date) => void;
}

interface BlockPosition {
	top: number;
	height: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PIXELS_PER_HOUR = 120;
const SNAP_MINUTES = 15;
const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;
const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;
const TOTAL_HOURS = 24;
const TOTAL_HEIGHT = TOTAL_HOURS * PIXELS_PER_HOUR;

const BLOCK_COLORS = [
	"#8b9a6b", // olive (default)
	"#6b8b9a", // slate blue
	"#9a6b8b", // mauve
	"#9a8b6b", // tan
	"#6b9a8b", // teal
	"#9a6b6b", // rose
	"#7b6b9a", // purple
	"#6b9a6b", // green
	"#c0956b", // amber
	"#5a7a9a", // steel blue
];

// =============================================================================
// HELPERS
// =============================================================================

function minutesFromMidnight(date: Date): number {
	return date.getHours() * 60 + date.getMinutes();
}

function timeToY(hour: number, minute: number = 0): number {
	return (
		(hour - DAY_START_HOUR) * 60 * PIXELS_PER_MINUTE +
		minute * PIXELS_PER_MINUTE
	);
}

function getBlockStyle(block: TimeBlock): BlockPosition {
	const start = new Date(block.start_time);
	const end = new Date(block.end_time);
	const startMinutes = minutesFromMidnight(start);
	const endMinutes = minutesFromMidnight(end);
	const top = (startMinutes - DAY_START_HOUR * 60) * PIXELS_PER_MINUTE;
	const height = (endMinutes - startMinutes) * PIXELS_PER_MINUTE;
	return { top, height };
}

interface LayoutedBlock {
	block: TimeBlock;
	column: number;
	totalColumns: number;
}

function computeBlockLayout(blocks: TimeBlock[]): LayoutedBlock[] {
	if (blocks.length === 0) return [];

	const sorted = [...blocks].sort(
		(a, b) =>
			new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
	);

	const result: LayoutedBlock[] = sorted.map((block) => ({
		block,
		column: 0,
		totalColumns: 1,
	}));

	// Find overlapping groups
	const groups: number[][] = [];
	const visited = new Set<number>();

	for (let i = 0; i < sorted.length; i++) {
		if (visited.has(i)) continue;
		const group = [i];
		visited.add(i);
		const groupEnd = () =>
			Math.max(...group.map((idx) => new Date(sorted[idx].end_time).getTime()));

		for (let j = i + 1; j < sorted.length; j++) {
			if (new Date(sorted[j].start_time).getTime() < groupEnd()) {
				group.push(j);
				visited.add(j);
			}
		}
		groups.push(group);
	}

	// Assign columns within each group
	for (const group of groups) {
		const columns: number[][] = [];

		for (const idx of group) {
			const blockStart = new Date(sorted[idx].start_time).getTime();
			const blockEnd = new Date(sorted[idx].end_time).getTime();

			let placed = false;
			for (let col = 0; col < columns.length; col++) {
				const colBlocks = columns[col];
				const lastInCol = colBlocks[colBlocks.length - 1];
				const lastEnd = new Date(sorted[lastInCol].end_time).getTime();
				if (blockStart >= lastEnd) {
					columns[col].push(idx);
					result[idx].column = col;
					placed = true;
					break;
				}
			}

			if (!placed) {
				result[idx].column = columns.length;
				columns.push([idx]);
			}
		}

		const total = columns.length;
		for (const idx of group) {
			result[idx].totalColumns = total;
		}
	}

	return result;
}

function getTaskScheduledTime(task: Task): Date | null {
	if (!task.scheduled_at) return null;
	return new Date(task.scheduled_at);
}

function isTaskInBlock(task: Task, block: TimeBlock): boolean {
	const blockStart = new Date(block.start_time);
	const blockEnd = new Date(block.end_time);

	if (task.status === "completed") {
		if (!task.completed_at) return false;
		const completedAt = new Date(task.completed_at);
		return completedAt >= blockStart && completedAt < blockEnd;
	}

	const scheduled = getTaskScheduledTime(task);
	if (!scheduled) return false;
	return scheduled >= blockStart && scheduled < blockEnd;
}

// =============================================================================
// SCHEDULABLE TASK ITEM (for Unscheduled Tasks view - no drag-drop)
// =============================================================================

function SchedulableTaskItem({
	task,
	onStart,
	onSchedule,
	isPending = false,
}: {
	task: Task;
	onStart?: (task: Task) => void;
	onSchedule?: (task: Task) => void;
	isPending?: boolean;
}) {
	const isCompleted = task.status === "completed";

	return (
		<div
			className={`
				group flex items-center gap-2 p-2 rounded-md border text-sm
				${
					isPending
						? "bg-[#8b9a6b]/10 border-[#8b9a6b] ring-1 ring-[#8b9a6b]"
						: "bg-card border-border hover:bg-accent/50"
				}
        		${isCompleted ? "opacity-60" : ""}
      		`}
		>
			{/* Schedule button - tap to select block */}
			<button
				onClick={() => onSchedule?.(task)}
				className={`
					p-1.5 rounded-md shrink-0 transition-colors
					${
						isPending
							? "bg-[#8b9a6b] text-white"
							: "bg-muted hover:bg-[#8b9a6b] hover:text-white text-muted-foreground"
					}
				`}
				title="Schedule task"
			>
				<Clock className="w-4 h-4" />
			</button>

			<div className="flex-1 min-w-0">
				<p
					className={`truncate ${isCompleted ? "line-through text-muted-foreground" : ""}`}
				>
					{task.text}
				</p>
			</div>

			{/* Play button - always visible for unscheduled tasks */}
			{!isCompleted && onStart && (
				<button
					onClick={() => onStart(task)}
					className="p-1.5 hover:bg-accent rounded-md shrink-0 text-[#8b9a6b]"
					title="Start task now"
				>
					<Play className="w-4 h-4 fill-current" />
				</button>
			)}
		</div>
	);
}

// =============================================================================
// CONTEXT MENU
// =============================================================================

interface ContextMenuState {
	x: number;
	y: number;
	block: TimeBlock | null;
}

function BlockContextMenu({
	menu,
	onClose,
	onUpdateBlock,
}: {
	menu: ContextMenuState;
	onClose: () => void;
	onUpdateBlock: (id: string, updates: Partial<TimeBlock>) => void;
}) {
	const [editTitle, setEditTitle] = useState("");
	const [showColorPicker, setShowColorPicker] = useState(false);

	useEffect(() => {
		if (menu.block) {
			setEditTitle(menu.block.label);
		}
	}, [menu.block]);

	if (!menu.block) return null;

	const handleSaveTitle = () => {
		const trimmed = editTitle.trim();
		if (trimmed && trimmed !== menu.block!.label) {
			onUpdateBlock(menu.block!.id, { label: trimmed });
		}
		onClose();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") handleSaveTitle();
		if (e.key === "Escape") onClose();
	};

	return (
		<>
			{/* Backdrop to close on click outside */}
			<div className="fixed inset-0 z-40" onClick={onClose} />

			{/* Context menu */}
			<div
				className="fixed z-50 min-w-[200px] bg-popover border border-border rounded-lg shadow-xl py-2"
				style={{ left: menu.x, top: menu.y }}
			>
				{/* Title edit section */}
				<div className="px-3 py-2 border-b border-border">
					<label className="text-xs text-muted-foreground block mb-1.5">
						Block Title
					</label>
					<input
						type="text"
						value={editTitle}
						onChange={(e) => setEditTitle(e.target.value)}
						onKeyDown={handleKeyDown}
						onClick={(e) => e.stopPropagation()}
						className="w-full text-sm px-2 py-1.5 rounded border border-input bg-background focus:outline-none focus:ring-2 focus:ring-[#8b9a6b]"
						autoFocus
					/>
					<div className="flex gap-2 mt-2">
						<button
							onClick={handleSaveTitle}
							className="flex-1 text-xs bg-[#8b9a6b] text-white px-2 py-1 rounded hover:bg-[#8b9a6b]/90"
						>
							Save
						</button>
						<button
							onClick={onClose}
							className="flex-1 text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80"
						>
							Cancel
						</button>
					</div>
				</div>

				{/* Color picker section */}
				<div className="px-3 py-2">
					<label className="text-xs text-muted-foreground block mb-1.5">
						Color
					</label>
					<div className="grid grid-cols-5 gap-1.5">
						{BLOCK_COLORS.map((color) => (
							<button
								key={color}
								onClick={() => {
									onUpdateBlock(menu.block!.id, { color });
									onClose();
								}}
								className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
								style={{
									backgroundColor: color,
									borderColor:
										color === menu.block!.color ? "white" : "transparent",
									boxShadow:
										color === menu.block!.color ? "0 0 0 1px #8b9a6b" : "none",
								}}
								title={color}
							/>
						))}
					</div>
				</div>
			</div>
		</>
	);
}

// =============================================================================
// TIME BLOCK CARD
// =============================================================================

function TimeBlockCard({
	block,
	tasks,
	completedTasks,
	onUpdateBlock,
	onDeleteBlock,
	onStartTask,
	onSelect,
	onDragBlockStart,
	onDragBlockEnd,
	onAssignPendingTask,
	pendingTask,
	column,
	totalColumns,
	onContextMenu,
}: {
	block: TimeBlock;
	tasks: Task[];
	completedTasks: Task[];
	onUpdateBlock: (id: string, updates: Partial<TimeBlock>) => void;
	onDeleteBlock: (id: string) => void;
	onStartTask: (task: Task) => void;
	onSelect: (blockId: string) => void;
	onDragBlockStart: () => void;
	onDragBlockEnd: () => void;
	onAssignPendingTask: (block: TimeBlock) => void;
	pendingTask: Task | null;
	column: number;
	totalColumns: number;
	onContextMenu?: (e: React.MouseEvent, block: TimeBlock) => void;
}) {
	const [isPressing, setIsPressing] = useState(false);
	const resizeStartRef = useRef<{
		y: number;
		endMinutes: number;
	} | null>(null);
	const [resizingEndMinutes, setResizingEndMinutes] = useState<number | null>(
		null,
	);

	const resizeTopStartRef = useRef<{
		y: number;
		startMinutes: number;
	} | null>(null);
	const [resizingStartMinutes, setResizingStartMinutes] = useState<
		number | null
	>(null);

	const didMoveRef = useRef(false);
	const didLongPressRef = useRef(false);

	const moveStartRef = useRef<{
		y: number;
		startMinutes: number;
		endMinutes: number;
		duration: number;
	} | null>(null);
	const [movingTopMinutes, setMovingTopMinutes] = useState<number | null>(null);

	const position = useMemo(() => {
		if (movingTopMinutes !== null) {
			const blockStart = new Date(block.start_time);
			const blockEnd = new Date(block.end_time);
			const duration =
				blockEnd.getHours() * 60 +
				blockEnd.getMinutes() -
				(blockStart.getHours() * 60 + blockStart.getMinutes());
			return {
				top: movingTopMinutes * PIXELS_PER_MINUTE,
				height: duration * PIXELS_PER_MINUTE,
			};
		}

		const startMinutes =
			resizingStartMinutes !== null
				? resizingStartMinutes
				: new Date(block.start_time).getHours() * 60 +
					new Date(block.start_time).getMinutes();

		const endMinutes =
			resizingEndMinutes !== null
				? resizingEndMinutes
				: new Date(block.end_time).getHours() * 60 +
					new Date(block.end_time).getMinutes();

		return {
			top: startMinutes * PIXELS_PER_MINUTE,
			height: Math.max(30, (endMinutes - startMinutes) * PIXELS_PER_MINUTE),
		};
	}, [block, resizingStartMinutes, resizingEndMinutes, movingTopMinutes]);

	const { setNodeRef, isOver } = useDroppable({
		id: block.id,
		data: { block },
	});

	const blockTasks = useMemo(() => {
		return [...tasks, ...completedTasks]
			.filter((t) => isTaskInBlock(t, block))
			.sort((a, b) => {
				const aTime = getTaskScheduledTime(a)?.getTime() || 0;
				const bTime = getTaskScheduledTime(b)?.getTime() || 0;
				return aTime - bTime;
			});
	}, [tasks, completedTasks, block]);

	const [editingStart, setEditingStart] = useState(false);
	const [editingEnd, setEditingEnd] = useState(false);
	const [showColorPicker, setShowColorPicker] = useState(false);

	const [titleValue, setTitleValue] = useState(block.label);

	// Keep local title in sync with prop updates
	useEffect(() => {
		setTitleValue(block.label);
	}, [block.label]);

	const [startVal, setStartVal] = useState(
		format(new Date(block.start_time), "HH:mm"),
	);
	const [endVal, setEndVal] = useState(
		format(new Date(block.end_time), "HH:mm"),
	);

	const commitTime = (which: "start" | "end", val: string) => {
		const [h, m] = val.split(":").map(Number);
		if (isNaN(h) || isNaN(m)) return;
		const base = new Date(
			which === "start" ? block.start_time : block.end_time,
		);
		base.setHours(h, m, 0, 0);
		onUpdateBlock(block.id, {
			[which === "start" ? "start_time" : "end_time"]: base.toISOString(),
		});
		which === "start" ? setEditingStart(false) : setEditingEnd(false);
	};

	const blockColor = block.color || "var(--foreground)";
	const isShort = position.height < 48;

	const handleBottomResizeDown = (e: React.PointerEvent) => {
		e.preventDefault();
		e.stopPropagation();
		onDragBlockStart();

		const blockEnd = new Date(block.end_time);
		resizeStartRef.current = {
			y: e.clientY,
			endMinutes: blockEnd.getHours() * 60 + blockEnd.getMinutes(),
		};

		const onMove = (ev: PointerEvent) => {
			if (!resizeStartRef.current) return;
			const deltaY = ev.clientY - resizeStartRef.current.y;
			const rawDelta = deltaY / PIXELS_PER_MINUTE;
			const snapped = Math.round(rawDelta / SNAP_MINUTES) * SNAP_MINUTES;
			const blockStart = new Date(block.start_time);
			const startMinutes = blockStart.getHours() * 60 + blockStart.getMinutes();
			const newEnd = Math.max(
				startMinutes + 30,
				resizeStartRef.current.endMinutes + snapped,
			);
			setResizingEndMinutes(newEnd);
		};

		const onUp = (ev: PointerEvent) => {
			if (!resizeStartRef.current) return;
			const deltaY = ev.clientY - resizeStartRef.current.y;
			const rawDelta = deltaY / PIXELS_PER_MINUTE;
			const snapped = Math.round(rawDelta / SNAP_MINUTES) * SNAP_MINUTES;
			const blockStart = new Date(block.start_time);
			const startMinutes = blockStart.getHours() * 60 + blockStart.getMinutes();
			const newEndMinutes = Math.max(
				startMinutes + 30,
				resizeStartRef.current.endMinutes + snapped,
			);

			const newEnd = new Date(block.end_time);
			newEnd.setHours(Math.floor(newEndMinutes / 60), newEndMinutes % 60, 0, 0);
			onUpdateBlock(block.id, { end_time: newEnd.toISOString() });

			resizeStartRef.current = null;
			setResizingEndMinutes(null);
			onDragBlockEnd();

			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
		};

		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	};

	const handleTopResizeDown = (e: React.PointerEvent) => {
		e.preventDefault();
		e.stopPropagation();
		onDragBlockStart();

		const blockStart = new Date(block.start_time);
		resizeTopStartRef.current = {
			y: e.clientY,
			startMinutes: blockStart.getHours() * 60 + blockStart.getMinutes(),
		};

		const onMove = (ev: PointerEvent) => {
			if (!resizeTopStartRef.current) return;
			const deltaY = ev.clientY - resizeTopStartRef.current.y;
			const rawDelta = deltaY / PIXELS_PER_MINUTE;
			const snapped = Math.round(rawDelta / SNAP_MINUTES) * SNAP_MINUTES;
			const blockEnd = new Date(block.end_time);
			const endMinutes = blockEnd.getHours() * 60 + blockEnd.getMinutes();
			const newStart = Math.min(
				endMinutes - 30,
				resizeTopStartRef.current.startMinutes + snapped,
			);
			setResizingStartMinutes(Math.max(0, newStart));
		};

		const onUp = (ev: PointerEvent) => {
			if (!resizeTopStartRef.current) return;
			const deltaY = ev.clientY - resizeTopStartRef.current.y;
			const rawDelta = deltaY / PIXELS_PER_MINUTE;
			const snapped = Math.round(rawDelta / SNAP_MINUTES) * SNAP_MINUTES;
			const blockEnd = new Date(block.end_time);
			const endMinutes = blockEnd.getHours() * 60 + blockEnd.getMinutes();
			const newStartMinutes = Math.max(
				0,
				Math.min(
					endMinutes - 30,
					resizeTopStartRef.current.startMinutes + snapped,
				),
			);

			const newStart = new Date(block.start_time);
			newStart.setHours(
				Math.floor(newStartMinutes / 60),
				newStartMinutes % 60,
				0,
				0,
			);
			onUpdateBlock(block.id, { start_time: newStart.toISOString() });

			resizeTopStartRef.current = null;
			setResizingStartMinutes(null);
			onDragBlockEnd();

			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
		};

		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	};

	const handleMovePointerDown = (e: React.PointerEvent) => {
		if ((e.target as HTMLElement).closest("input, button, [data-no-move]"))
			return;
		e.preventDefault();
		didMoveRef.current = false;

		const LONG_PRESS_MS = 200;

		// Capture initial pointer position for move handlers
		const startClientY = e.clientY;

		const cancel = () => {
			clearTimeout(timer);
			window.removeEventListener("pointerup", cancel);
			window.removeEventListener("pointercancel", cancel);
		};

		const timer = setTimeout(() => {
			setIsPressing(true);
			didLongPressRef.current = true;
			// Clean up the cancel listeners — long press confirmed
			window.removeEventListener("pointerup", cancel);
			window.removeEventListener("pointercancel", cancel);

			const blockStart = new Date(block.start_time);
			const blockEnd = new Date(block.end_time);
			const startMinutes = blockStart.getHours() * 60 + blockStart.getMinutes();
			const endMinutes = blockEnd.getHours() * 60 + blockEnd.getMinutes();

			moveStartRef.current = {
				y: startClientY,
				startMinutes,
				endMinutes,
				duration: endMinutes - startMinutes,
			};

			onDragBlockStart();

			const onMove = (ev: PointerEvent) => {
				if (!moveStartRef.current) return;
				if (Math.abs(ev.clientY - moveStartRef.current.y) > 5)
					didMoveRef.current = true;
				const deltaY = ev.clientY - moveStartRef.current.y;
				const rawDelta = deltaY / PIXELS_PER_MINUTE;
				const snapped = Math.round(rawDelta / SNAP_MINUTES) * SNAP_MINUTES;
				const newStart = Math.max(
					0,
					Math.min(
						1440 - moveStartRef.current.duration,
						moveStartRef.current.startMinutes + snapped,
					),
				);
				// Direct DOM — no re-render
				if (blockDivRef.current) {
					blockDivRef.current.style.top = `${newStart * PIXELS_PER_MINUTE}px`;
				}
			};

			const onUp = (ev: PointerEvent) => {
				if (!moveStartRef.current) return;
				const deltaY = ev.clientY - moveStartRef.current.y;
				const rawDelta = deltaY / PIXELS_PER_MINUTE;
				const snapped = Math.round(rawDelta / SNAP_MINUTES) * SNAP_MINUTES;
				const newStartMinutes = Math.max(
					0,
					Math.min(
						1440 - moveStartRef.current.duration,
						moveStartRef.current.startMinutes + snapped,
					),
				);
				const newEndMinutes = newStartMinutes + moveStartRef.current.duration;

				const newStart = new Date(block.start_time);
				newStart.setHours(
					Math.floor(newStartMinutes / 60),
					newStartMinutes % 60,
					0,
					0,
				);

				const newEnd = new Date(block.end_time);
				newEnd.setHours(
					Math.floor(newEndMinutes / 60),
					newEndMinutes % 60,
					0,
					0,
				);

				onUpdateBlock(block.id, {
					start_time: newStart.toISOString(),
					end_time: newEnd.toISOString(),
				});

				moveStartRef.current = null;
				setMovingTopMinutes(null);
				onDragBlockEnd();
				didMoveRef.current = false;
				setTimeout(() => {
					didLongPressRef.current = false;
				}, 0);

				window.removeEventListener("pointermove", onMove);
				window.removeEventListener("pointerup", onUp);
			};

			// Register move listeners AFTER long press confirmed
			window.addEventListener("pointermove", onMove);
			window.addEventListener("pointerup", onUp);
		}, LONG_PRESS_MS);

		window.addEventListener("pointerup", cancel);
		window.addEventListener("pointercancel", cancel);
	};

	useEffect(() => {
		if (!showColorPicker) return;
		const handler = (e: MouseEvent) => setShowColorPicker(false);
		// Use setTimeout to skip the current event that opened the picker
		const id = setTimeout(() => {
			window.addEventListener("mousedown", handler);
		}, 0);
		return () => {
			clearTimeout(id);
			window.removeEventListener("mousedown", handler);
		};
	}, [showColorPicker]);

	const blockDivRef = useRef<HTMLDivElement>(null);

	return (
		<div
			ref={(el) => {
				setNodeRef(el);
				(blockDivRef as React.MutableRefObject<HTMLDivElement | null>).current =
					el;
			}}
			className="group absolute border border-border rounded-md overflow-hidden cursor-grab active:cursor-grabbing"
			style={{
				top: position.top,
				height: Math.max(position.height, 36),
				backgroundColor: blockColor,
				opacity: isOver ? 0.85 : movingTopMinutes !== null ? 0.85 : 1,
				outline:
					isOver || pendingTask
						? "2px solid rgba(255,255,255,0.6)"
						: isPressing
							? "2px solid rgba(255,255,255,0.3)"
							: "none",
				transition:
					movingTopMinutes !== null
						? "none"
						: "opacity 120ms, outline 120ms, transform 150ms",
				zIndex: movingTopMinutes !== null ? 20 : "auto",
				boxShadow:
					movingTopMinutes !== null ? "0 4px 20px rgba(0,0,0,0.25)" : "none",
				left: `calc(${(column / totalColumns) * 100}% + 4px)`,
				width: `calc(${(1 / totalColumns) * 100}% - 8px)`,
				transform: isPressing ? "scale(1.02)" : "scale(1)",
				touchAction: "none",
			}}
			onPointerDown={(e) => {
				handleMovePointerDown(e);
			}}
			onPointerUp={() => setIsPressing(false)}
			onPointerCancel={() => {
				setIsPressing(false);
				didMoveRef.current = false;
				setTimeout(() => {
					didLongPressRef.current = false;
				}, 0);
				moveStartRef.current = null;
				setMovingTopMinutes(null);
				onDragBlockEnd();
			}}
			onClick={() => {
				if (didLongPressRef.current) return;
				if (pendingTask) {
					onAssignPendingTask(block);
				} else {
					onSelect(block.id);
				}
			}}
			onContextMenu={(e) => onContextMenu?.(e, block)}
		>
			{/* Top resize handle */}
			<div
				onPointerDown={handleTopResizeDown}
				onClick={(e) => e.stopPropagation()}
				className="absolute top-0 left-0 right-0 flex items-center justify-center
             cursor-ns-resize z-10 touch-none"
				style={{ height: 20 }}
			>
				<div className="flex gap-[3px] items-center">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="w-1 h-1 rounded-full bg-white/50" />
					))}
				</div>
			</div>
			{/* Single row layout for short blocks, two-row for taller */}
			<div
				className={`flex items-start justify-between px-2 gap-2 h-full touch-none ${isShort ? "" : "py-1.5 flex-wrap"}`}
			>
				{/* Left: label input + task count */}
				<div
					className="flex flex-col justify-between w-fit h-full"
					onClick={(e) => e.stopPropagation()}
				>
					<input
						className="font-semibold text-xs bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-white/50 rounded px-1 -ml-1"
						style={{ color: "var(--primary-foreground)" }}
						value={titleValue}
						onChange={(e) => setTitleValue(e.target.value)}
						onBlur={() => {
							const newLabel = titleValue.trim();
							if (newLabel && newLabel !== block.label) {
								onUpdateBlock(block.id, { label: newLabel });
							} else {
								setTitleValue(block.label); // Reset if invalid
							}
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.currentTarget.blur();
							}
							e.stopPropagation();
						}}
					/>
					{blockTasks.length > 0 && (
						<div className="font-mono bg-muted p-1 rounded-full w-5 h-5 flex items-center justify-center">
							<span className="text-xs">{blockTasks.length}</span>
						</div>
					)}
				</div>

				{/* Right: color-picker + time chips + delete */}
				{!isShort && (
					<div
						className="flex flex-col items-end justify-between h-full gap-1 shrink-0"
						data-no-move
						onClick={(e) => e.stopPropagation()}
					>
						{/* Delete button */}
						<button
							onClick={() => onDeleteBlock(block.id)}
							className="hover:bg-card/10 transition-opacity text-xs p-1 rounded"
						>
							<X className="w-4 h-4 text-muted" />
						</button>

						{/* Time Chip */}
						<div className="p-3 flex gap-3 items-center">
							{/* Start time chip */}
							{editingStart ? (
								<input
									autoFocus
									type="time"
									value={startVal}
									onChange={(e) => setStartVal(e.target.value)}
									onBlur={() => commitTime("start", startVal)}
									onKeyDown={(e) => {
										if (e.key === "Enter") commitTime("start", startVal);
										if (e.key === "Escape") setEditingStart(false);
										e.stopPropagation();
									}}
									className="text-xs rounded px-1 py-0.5 border-none outline-none w-20"
									style={{
										backgroundColor: "rgba(0,0,0,0.3)",
										color: "var(--primary-foreground)",
									}}
								/>
							) : (
								<button
									onClick={() => setEditingStart(true)}
									className="text-xs rounded px-1.5 py-0.5 transition-colors"
									style={{
										backgroundColor: "rgba(0,0,0,0.2)",
										color: "var(--primary-foreground)",
									}}
									onMouseEnter={(e) =>
										(e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.35)")
									}
									onMouseLeave={(e) =>
										(e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.2)")
									}
								>
									{format(new Date(block.start_time), "h:mm a")}
								</button>
							)}

							<span
								className="text-xs"
								style={{ color: "var(--primary-foreground)", opacity: 0.6 }}
							>
								to
							</span>

							{/* End time chip */}
							{editingEnd ? (
								<input
									autoFocus
									type="time"
									value={endVal}
									onChange={(e) => setEndVal(e.target.value)}
									onBlur={() => commitTime("end", endVal)}
									onKeyDown={(e) => {
										if (e.key === "Enter") commitTime("end", endVal);
										if (e.key === "Escape") setEditingEnd(false);
										e.stopPropagation();
									}}
									className="text-xs rounded px-1 py-0.5 border-none outline-none w-20"
									style={{
										backgroundColor: "rgba(0,0,0,0.3)",
										color: "var(--primary-foreground)",
									}}
								/>
							) : (
								<button
									onClick={() => setEditingEnd(true)}
									className="text-xs rounded px-1.5 py-0.5 transition-colors"
									style={{
										backgroundColor: "rgba(0,0,0,0.2)",
										color: "var(--primary-foreground)",
									}}
									onMouseEnter={(e) =>
										(e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.35)")
									}
									onMouseLeave={(e) =>
										(e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.2)")
									}
								>
									{format(new Date(block.end_time), "h:mm a")}
								</button>
							)}
						</div>
					</div>
				)}

				{/* Short block: just show times inline */}
				{isShort && (
					<span
						className="text-xs shrink-0 opacity-75"
						style={{ color: "var(--primary-foreground)" }}
					>
						{format(new Date(block.start_time), "h:mm")}–
						{format(new Date(block.end_time), "h:mm a")}
					</span>
				)}
			</div>
			{/* Bottom resize handle */}
			<div
				onPointerDown={handleBottomResizeDown}
				onClick={(e) => e.stopPropagation()}
				className="absolute bottom-0 left-0 right-0 flex items-center justify-center
             cursor-ns-resize z-10 touch-none"
				style={{ height: 20 }}
			>
				<div className="flex gap-[3px] items-center">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="w-1 h-1 rounded-full bg-white/50" />
					))}
				</div>
			</div>
		</div>
	);
}

// =============================================================================
// BLOCK DETAIL PANEL
// =============================================================================

function BlockDetailPanel({
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

// =============================================================================
// TIME INDICATOR
// =============================================================================

function CurrentTimeIndicator() {
	const [now, setNow] = useState(new Date());

	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), 60_000);
		return () => clearInterval(id);
	}, []);

	const minutes = now.getHours() * 60 + now.getMinutes();
	const top = minutes * PIXELS_PER_MINUTE;

	return (
		<div
			className="absolute left-0 right-0 z-10 pointer-events-none"
			style={{ top }}
		>
			<div className="relative flex items-center">
				<div className="w-2 h-2 rounded-full bg-red-500 shrink-0 -ml-1" />
				<div className="flex-1 border-t border-red-500" />
			</div>
		</div>
	);
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ScheduleView({
	date,
	timeBlocks,
	tasks,
	completedTasks,
	onScheduleTask,
	onUnscheduleTask,
	onCreateBlock,
	onUpdateBlock,
	onDeleteBlock,
	onStartTask,
	onDateChange,
}: ScheduleViewProps) {
	const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
	const [isDraggingBlock, setIsDraggingBlock] = useState(false);
	const [pendingTask, setPendingTask] = useState<Task | null>(null);
	const [contextMenu, setContextMenu] = useState<ContextMenuState>({
		x: 0,
		y: 0,
		block: null,
	});

	const [mobileTab, setMobileTab] = useState<
		"timeline" | "unscheduled" | "block"
	>("timeline");

	const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
	const todayBlocks = useMemo(
		() => timeBlocks.filter((b) => isSameDay(new Date(b.start_time), date)),
		[timeBlocks, date],
	);
	const layoutedBlocks = useMemo(
		() => computeBlockLayout(todayBlocks),
		[todayBlocks],
	);

	const selectedBlock = useMemo(
		() => todayBlocks.find((b) => b.id === selectedBlockId) ?? null,
		[todayBlocks, selectedBlockId],
	);

	const timelineScrollRef = useRef<HTMLDivElement>(null);
	const labelsScrollRef = useRef<HTMLDivElement>(null);

	const handleSelectBlock = useCallback((blockId: string) => {
		setSelectedBlockId(blockId);
		setMobileTab("block");
	}, []);

	const handleTimelineScroll = useCallback(() => {
		if (labelsScrollRef.current && timelineScrollRef.current) {
			labelsScrollRef.current.scrollTop = timelineScrollRef.current.scrollTop;
		}
	}, []);

	// Close panel if selected block gets deleted
	useEffect(() => {
		if (selectedBlockId && !todayBlocks.find((b) => b.id === selectedBlockId)) {
			setSelectedBlockId(null);
			setMobileTab("timeline");
		}
	}, [todayBlocks, selectedBlockId]);

	useEffect(() => {
		if (!timelineScrollRef.current) return;
		const now = new Date();
		const minutes = now.getHours() * 60 + now.getMinutes();
		const top = minutes * PIXELS_PER_MINUTE - 120; // 120px above current time
		timelineScrollRef.current.scrollTop = Math.max(0, top);
	}, []); // only on mount

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 }, // desktop: start drag after 8px move
		}),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 250, tolerance: 5 }, // mobile: long-press 250ms
		}),
	);

	const dayTasks = useMemo(
		() =>
			tasks.filter(
				(t) => t.scheduled_at && isSameDay(new Date(t.scheduled_at), date),
			),
		[tasks, date],
	);

	const dayCompletedTasks = useMemo(
		() =>
			completedTasks.filter(
				(t) => t.completed_at && isSameDay(new Date(t.completed_at), date),
			),
		[completedTasks, date],
	);

	const unscheduledTasks = useMemo(
		() =>
			tasks.filter((t) => {
				if (t.status === "completed") return false;
				if (!t.scheduled_at) return true;
				return !isSameDay(new Date(t.scheduled_at), date);
			}),
		[tasks, date],
	);

	const handleDragStart = useCallback((event: DragStartEvent) => {
		const task = event.active.data.current?.task as Task | undefined;
		if (task) {
			setActiveDragTask(task);
		}
	}, []);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			setActiveDragTask(null);
			setMobileTab("timeline");
			const { active, over } = event;
			if (!over) {
				// Dropped outside any block — go back to unscheduled
				setMobileTab("unscheduled");
				return;
			}
			const block = over.data.current?.block as TimeBlock | undefined;
			if (!block) return;

			// Calculate drop position within the block
			const blockStart = new Date(block.start_time);
			const blockEnd = new Date(block.end_time);
			const blockStartMinutes =
				blockStart.getHours() * 60 + blockStart.getMinutes();
			const blockEndMinutes = blockEnd.getHours() * 60 + blockEnd.getMinutes();

			// Get pointer Y relative to the timeline scroll container
			const container = timelineScrollRef.current;
			let scheduledMinutes = blockStartMinutes;

			// Alternative using dnd-kit's delta (more accurate for drop point)
			if (container && event.activatorEvent instanceof PointerEvent) {
				const activatorY =
					event.activatorEvent.clientY -
					container.getBoundingClientRect().top +
					container.scrollTop;
				const dropY = activatorY + event.delta.y;
				const rawMinutes = dropY / PIXELS_PER_MINUTE;
				const snapped = Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;
				scheduledMinutes = Math.max(
					blockStartMinutes,
					Math.min(blockEndMinutes - SNAP_MINUTES, snapped),
				);
			}

			const scheduledAt = new Date(block.start_time);
			scheduledAt.setHours(
				Math.floor(scheduledMinutes / 60),
				scheduledMinutes % 60,
				0,
				0,
			);

			await onScheduleTask(active.id as string, scheduledAt.toISOString());
		},
		[onScheduleTask],
	);

	const handleCreateBlock = useCallback(
		async (hour: number) => {
			const start = new Date(date);
			start.setHours(hour, 0, 0, 0);
			const end = addMinutes(start, 60);
			await onCreateBlock({
				start_time: start.toISOString(),
				end_time: end.toISOString(),
				label: "New Block",
				color: "#8b9a6b",
			});
		},
		[date, onCreateBlock],
	);

	const handleBlockContextMenu = useCallback(
		(e: React.MouseEvent, block: TimeBlock) => {
			// Disable on touch devices - use edit button in panel instead
			const isTouch = window.matchMedia("(pointer: coarse)").matches;
			if (isTouch) return;

			e.preventDefault();
			e.stopPropagation();

			const x = Math.min(e.clientX, window.innerWidth - 220);
			const y = Math.min(e.clientY, window.innerHeight - 200);

			setContextMenu({ x, y, block });
		},
		[],
	);

	const closeContextMenu = useCallback(() => {
		setContextMenu((prev) => ({ ...prev, block: null }));
	}, []);

	return (
		// h-full — fills whatever <main> gives it, no hardcoded viewport math
		<DndContext
			sensors={sensors}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			collisionDetection={pointerWithin}
			autoScroll={{
				enabled: true,
				threshold: { x: 0, y: 0.2 },
				interval: 5,
				acceleration: 10,
			}}
		>
			<div className="flex flex-col h-full">
				{/* Date nav */}
				<div className="flex items-center gap-3 px-4 py-2 border-b border-border shrink-0">
					<button
						onClick={() => onDateChange(addDays(date, -1))}
						className="p-1 hover:bg-accent rounded"
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
					<span className="text-sm font-medium">
						{isToday(date) ? "Today" : format(date, "EEE, MMM d")}
					</span>
					<button
						onClick={() => onDateChange(addDays(date, 1))}
						className="p-1 hover:bg-accent rounded"
					>
						<ChevronRight className="w-4 h-4" />
					</button>
					{!isToday(date) && (
						<button
							onClick={() => onDateChange(new Date())}
							className="text-xs text-muted-foreground hover:text-foreground"
						>
							Today
						</button>
					)}
				</div>

				{/* Pending task banner */}
				{pendingTask && (
					<div className="w-full flex items-center justify-between px-4 py-2 bg-[#8b9a6b] text-white text-sm shrink-0">
						<span>Tap a block to schedule</span>
						<button
							onClick={() => setPendingTask(null)}
							className="ml-2 shrink-0"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				)}

				{/* Body — min-h-0 is critical so flex children can shrink and scroll */}
				<div className="flex flex-1 min-h-0 flex-col md:flex-row">
					{/* Timeline column — full width on mobile, flex-1 on desktop */}
					<div
						className={`
							flex flex-1 relative border-r border-border min-h-0 md:flex
							${mobileTab === "timeline" || activeDragTask ? "flex" : "hidden"}
						`}
					>
						{/* Time labels — hidden scrollbar, driven by timeline scroll */}
						<div
							ref={labelsScrollRef}
							className="w-10 md:w-16 shrink-0 border-r border-border bg-muted/30"
							style={{ overflowY: "hidden" }}
						>
							<div style={{ height: TOTAL_HEIGHT }}>
								{Array.from({ length: TOTAL_HOURS }).map((_, i) => {
									const hour = DAY_START_HOUR + i;
									const label =
										hour === 0
											? "12 am"
											: hour < 12
												? `${hour} am`
												: hour === 12
													? "12 pm"
													: `${hour - 12} pm`;
									return (
										<div
											key={hour}
											style={{ height: PIXELS_PER_HOUR, position: "relative" }}
										>
											<span
												className="absolute right-1 md:right-2 text-[10px] md:text-xs text-muted-foreground"
												style={{ top: -8 }}
											>
												{label}
											</span>
											<span
												className="absolute right-2 text-muted-foreground/50 hidden md:block"
												style={{ top: PIXELS_PER_HOUR / 2 - 8, fontSize: 10 }}
											>
												:30
											</span>
										</div>
									);
								})}
							</div>
						</div>

						{/* Scrollable timeline */}
						<div
							ref={timelineScrollRef}
							className="flex-1 overflow-y-auto overflow-x-hidden"
							onScroll={handleTimelineScroll}
						>
							<div className="relative" style={{ height: TOTAL_HEIGHT }}>
								{/* Hour + half-hour grid lines */}
								{Array.from({ length: TOTAL_HOURS }).map((_, i) => (
									<div key={i}>
										<div
											className="absolute w-full border-t border-border/30"
											style={{ top: (i + 1) * PIXELS_PER_HOUR }}
										/>
										<div
											className="absolute w-full border-t border-border/15"
											style={{
												top: (i + 0.5) * PIXELS_PER_HOUR,
												borderStyle: "dashed",
												opacity: 0.4,
											}}
										/>
									</div>
								))}

								{/* Current time indicator */}
								<CurrentTimeIndicator />

								{/* Time blocks */}
								{layoutedBlocks.map(({ block, column, totalColumns }) => (
									<TimeBlockCard
										key={block.id}
										block={block}
										column={column}
										totalColumns={totalColumns}
										tasks={dayTasks}
										completedTasks={dayCompletedTasks}
										onUpdateBlock={onUpdateBlock}
										onDeleteBlock={onDeleteBlock}
										onStartTask={onStartTask}
										onSelect={handleSelectBlock}
										onDragBlockStart={() => setIsDraggingBlock(true)}
										onDragBlockEnd={() => setIsDraggingBlock(false)}
										pendingTask={pendingTask}
										onAssignPendingTask={async (block) => {
											const scheduledAt = new Date(block.start_time);
											await onScheduleTask(
												pendingTask!.id,
												scheduledAt.toISOString(),
											);
											setPendingTask(null);
										}}
										onContextMenu={handleBlockContextMenu}
									/>
								))}
							</div>
						</div>

						{/* Add time block button */}
						<button
							onClick={() => handleCreateBlock(new Date().getHours())}
							className="absolute right-8 bottom-3 max-sm:right-3 ml-auto flex px-2 gap-1 py-1 w-fit items-center text-sm text-card rounded-[3px] bg-af4-olive hover:bg-af4-olive-muted shadow-md font-medium"
						>
							<Plus className="w-3 h-3" /> <span>Block</span>
						</button>
					</div>

					{/* Mobile bottom sheet — block detail only */}
					{selectedBlock && (
						<div
							className="fixed inset-x-0 bottom-0 z-50 md:hidden flex flex-col rounded-t-2xl
               border-t border-border bg-background shadow-2xl"
							style={{ maxHeight: "60vh" }}
						>
							{/* Drag pill */}
							<div className="flex justify-center pt-3 pb-1 shrink-0">
								<div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
							</div>
							<BlockDetailPanel
								block={selectedBlock}
								tasks={dayTasks}
								completedTasks={dayCompletedTasks}
								onClose={() => {
									setSelectedBlockId(null);
									setMobileTab("timeline");
								}}
								onStartTask={onStartTask}
								onUnscheduleTask={onUnscheduleTask}
								onUpdateBlock={onUpdateBlock}
								onDeleteBlock={onDeleteBlock}
							/>
						</div>
					)}

					{/* Desktop sidebar */}
					<div className="hidden md:flex flex-none w-80 flex-col min-h-0">
						{selectedBlock ? (
							<BlockDetailPanel
								block={selectedBlock}
								tasks={dayTasks}
								completedTasks={dayCompletedTasks}
								onClose={() => setSelectedBlockId(null)}
								onStartTask={onStartTask}
								onUnscheduleTask={onUnscheduleTask}
								onUpdateBlock={onUpdateBlock}
								onDeleteBlock={onDeleteBlock}
							/>
						) : (
							<div className="w-full flex flex-col min-h-0 bg-card">
								<div className="p-4 border-b border-border shrink-0">
									<h3 className="font-medium">Unscheduled</h3>
									<p className="text-sm text-muted-foreground">
										{unscheduledTasks.length} tasks • Tap clock to schedule
									</p>
								</div>
								<div className="flex-1 overflow-y-auto p-3 space-y-2">
									{unscheduledTasks.length === 0 ? (
										<p className="text-sm text-muted-foreground text-center py-8">
											All tasks scheduled! 🎉
										</p>
									) : (
										unscheduledTasks.map((task) => (
											<SchedulableTaskItem
												key={task.id}
												task={task}
												onStart={onStartTask}
												onSchedule={(t) => {
													setPendingTask(t);
													setMobileTab("timeline");
												}}
												isPending={pendingTask?.id === task.id}
											/>
										))
									)}
								</div>
							</div>
						)}
					</div>

					{/* Mobile unscheduled panel */}
					<div
						className={`
							w-full flex flex-col min-h-0 md:hidden
							${mobileTab === "unscheduled" && !selectedBlock ? "flex" : "hidden"}
						`}
					>
						<div className="p-4 border-b border-border shrink-0">
							<h3 className="font-medium">Unscheduled</h3>
							<p className="text-sm text-muted-foreground">
								{unscheduledTasks.length} tasks • Tap clock to schedule
							</p>
						</div>
						<div className="flex-1 overflow-y-auto p-3 space-y-2">
							{unscheduledTasks.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-8">
									All tasks scheduled! 🎉
								</p>
							) : (
								unscheduledTasks.map((task) => (
									<SchedulableTaskItem
										key={task.id}
										task={task}
										onStart={onStartTask}
										onSchedule={(t) => {
											setPendingTask(t);
											setMobileTab("timeline");
										}}
										isPending={pendingTask?.id === task.id}
									/>
								))
							)}
						</div>
					</div>
				</div>

				{/* Mobile bottom tab bar — hidden on desktop */}
				<div className="flex md:hidden border-t border-border shrink-0 bg-background">
					<button
						onClick={() => setMobileTab("timeline")}
						className={`flex-1 py-3 text-xs font-medium transition-colors
						${
							mobileTab === "timeline"
								? "text-foreground border-t-2 border-foreground -mt-px"
								: activeDragTask
									? "text-[#8b9a6b] animate-pulse"
									: "text-muted-foreground"
						}`}
					>
						Timeline
						{activeDragTask && mobileTab !== "timeline" && (
							<span className="ml-1">↑</span>
						)}
					</button>
					<button
						onClick={() => setMobileTab("unscheduled")}
						className={`flex-1 py-3 text-xs font-medium transition-colors
						${
							mobileTab === "unscheduled"
								? "text-foreground border-t-2 border-foreground -mt-px"
								: "text-muted-foreground"
						}`}
					>
						Unscheduled
						{unscheduledTasks.length > 0 && (
							<span className="ml-1 text-xs text-muted-foreground">
								({unscheduledTasks.length})
							</span>
						)}
					</button>
				</div>
			</div>

			{/* Drag overlay for time block dragging only */}
			<DragOverlay dropAnimation={{ duration: 150, easing: "ease-out" }}>
				{/* Task drag overlay removed - now using tap-to-schedule flow */}
			</DragOverlay>

			{/* Context Menu */}
			<BlockContextMenu
				menu={contextMenu}
				onClose={closeContextMenu}
				onUpdateBlock={onUpdateBlock}
			/>
		</DndContext>
	);
}
