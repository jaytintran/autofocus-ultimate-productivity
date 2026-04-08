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

const PIXELS_PER_HOUR = 80;
const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;
const SNAP_MINUTES = 30;
const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;
const TOTAL_HOURS = 24;
const TOTAL_HEIGHT = TOTAL_HOURS * PIXELS_PER_HOUR;

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

function getTaskScheduledTime(task: Task): Date | null {
	if (!task.scheduled_at) return null;
	return new Date(task.scheduled_at);
}

function isTaskInBlock(task: Task, block: TimeBlock): boolean {
	const scheduled = getTaskScheduledTime(task);
	if (!scheduled) return false;
	const blockStart = new Date(block.start_time);
	const blockEnd = new Date(block.end_time);
	return scheduled >= blockStart && scheduled < blockEnd;
}

// =============================================================================
// DRAGGABLE TASK ITEM
// =============================================================================

function DraggableTaskItem({
	task,
	isOverlay = false,
	onStart,
}: {
	task: Task;
	isOverlay?: boolean;
	onStart?: (task: Task) => void;
}) {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: task.id,
		disabled: isOverlay,
		data: { task },
	});

	const isCompleted = task.status === "completed";
	const scheduledTime = getTaskScheduledTime(task);

	return (
		<div
			ref={setNodeRef}
			{...attributes}
			{...listeners}
			style={{ opacity: isDragging ? 0.35 : 1, touchAction: "none" }}
			className={`
        group flex items-center gap-2 p-2 rounded-md border text-sm
        cursor-grab active:cursor-grabbing select-none
        ${
					isOverlay
						? "shadow-xl bg-background border-[#8b9a6b]"
						: "bg-card hover:bg-accent/50 border-border"
				}
        ${isCompleted ? "opacity-60" : ""}
      `}
		>
			<GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
			<div className="flex-1 min-w-0">
				<p
					className={`truncate ${isCompleted ? "line-through text-muted-foreground" : ""}`}
				>
					{task.text}
				</p>
				{scheduledTime && (
					<p className="text-xs text-muted-foreground">
						{format(scheduledTime, "h:mm a")}
					</p>
				)}
			</div>
			{isCompleted ? (
				<CheckCircle2 className="w-4 h-4 text-[#8b9a6b] shrink-0" />
			) : (
				<Circle className="w-4 h-4 text-muted-foreground shrink-0" />
			)}
			{onStart && !isCompleted && (
				<button
					onClick={(e) => {
						e.stopPropagation();
						onStart(task);
					}}
					className="p-1 hover:bg-accent rounded opacity-0 group-hover:opacity-100 transition-opacity"
				>
					<Clock className="w-3.5 h-3.5 text-[#8b9a6b]" />
				</button>
			)}
		</div>
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
}: {
	block: TimeBlock;
	tasks: Task[];
	completedTasks: Task[];
	onUpdateBlock: (id: string, updates: Partial<TimeBlock>) => void;
	onDeleteBlock: (id: string) => void;
	onStartTask: (task: Task) => void;
	onSelect: (blockId: string) => void;
}) {
	const position = getBlockStyle(block);

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

	return (
		<div
			ref={setNodeRef}
			className="group absolute left-2 right-2 rounded-md overflow-hidden cursor-pointer"
			style={{
				top: position.top,
				height: Math.max(position.height, 36),
				backgroundColor: blockColor,
				opacity: isOver ? 0.85 : 1,
				outline: isOver ? "2px solid var(--af4-highlight)" : "none",
				transition: "opacity 120ms, outline 120ms",
			}}
			onClick={() => onSelect(block.id)}
		>
			{/* Single row layout for short blocks, two-row for taller */}
			<div
				className={`flex items-start justify-between px-2 gap-2 h-full ${isShort ? "" : "py-1.5 flex-wrap"}`}
			>
				{/* Left: label input + task count */}
				<div
					className="flex flex-col justify-between w-fit h-full"
					onClick={(e) => e.stopPropagation()}
				>
					<input
						className="font-semibold text-xs"
						style={{ color: "var(--primary-foreground)" }}
						defaultValue={block.label}
						onBlur={(e) => {
							const newLabel = e.target.value.trim();
							if (newLabel && newLabel !== block.label)
								onUpdateBlock(block.id, { label: newLabel });
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter") e.currentTarget.blur();
							e.stopPropagation();
						}}
					/>
					{blockTasks.length > 0 && (
						<div className="font-mono bg-muted p-1 rounded-full w-5 h-5 flex items-center justify-center">
							<span className="text-xs">{blockTasks.length}</span>
						</div>
					)}
				</div>

				{/* Right: time chips + delete */}
				{!isShort && (
					<div
						className="flex flex-col items-end justify-between h-full gap-1 shrink-0"
						onClick={(e) => e.stopPropagation()} // don't open panel when clicking chips
					>
						{/* Delete */}
						<button
							onClick={() => onDeleteBlock(block.id)}
							className="hover:bg-card/10 transition-opacity text-xs p-1 rounded"
						>
							<X className="w-4 h-4 text-muted" />
						</button>
						{/* Time Chip */}
						<div className="p-3">
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
								–
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
		</div>
	);
}

// =============================================================================
// EMPTY SLOT
// =============================================================================

function EmptySlot({
	hour,
	onCreateBlock,
}: {
	hour: number;
	onCreateBlock: (hour: number) => void;
}) {
	return (
		<div
			className="absolute left-0 right-0"
			style={{ top: timeToY(hour), height: PIXELS_PER_HOUR }}
		>
			<button
				onClick={() => onCreateBlock(hour)}
				className="w-full h-full rounded border border-dashed border-border/40
                   hover:border-[#8b9a6b]/60 hover:bg-[#8b9a6b]/5
                   transition-colors flex items-center justify-center
                   opacity-0 hover:opacity-100"
			>
				<Plus className="w-4 h-4 text-muted-foreground" />
			</button>
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
		<div className="w-80 shrink-0 flex flex-col min-h-0 border-l border-border">
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
				<button
					onClick={onClose}
					className="p-1 rounded text-sm shrink-0"
					style={{
						color: "var(--primary-foreground)",
						backgroundColor: "rgba(0,0,0,0.2)",
					}}
				>
					×
				</button>
			</div>

			{/* Task count subheader */}
			<div className="px-4 py-2 border-b border-border shrink-0">
				<p className="text-xs text-muted-foreground">
					{blockTasks.length === 0
						? "No tasks — drag tasks here"
						: `${blockTasks.length} task${blockTasks.length > 1 ? "s" : ""}`}
				</p>
			</div>

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
									<Clock className="w-3.5 h-3.5 text-af4-olive" />
								</button>
							)}

							{/* Remove from block */}
							<button
								onClick={() => onUnscheduleTask(task.id)}
								className="p-1 hover:bg-destructive/10 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
								title="Remove from block"
							>
								<span className="text-xs text-muted-foreground hover:text-destructive">
									×
								</span>
							</button>
						</div>
					))
				)}
			</div>

			{/* Delete block footer */}
			<div className="p-3 border-t border-border shrink-0">
				<button
					onClick={async () => {
						await onDeleteBlock(block.id);
						onClose();
					}}
					className="w-full text-xs text-destructive hover:bg-destructive/10 rounded py-1.5 transition-colors"
				>
					Delete block
				</button>
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
	const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
	const todayBlocks = useMemo(
		() => timeBlocks.filter((b) => isSameDay(new Date(b.start_time), date)),
		[timeBlocks, date],
	);

	const selectedBlock = useMemo(
		() => todayBlocks.find((b) => b.id === selectedBlockId) ?? null,
		[todayBlocks, selectedBlockId],
	);

	const timelineScrollRef = useRef<HTMLDivElement>(null);
	const labelsScrollRef = useRef<HTMLDivElement>(null);

	const handleTimelineScroll = useCallback(() => {
		if (labelsScrollRef.current && timelineScrollRef.current) {
			labelsScrollRef.current.scrollTop = timelineScrollRef.current.scrollTop;
		}
	}, []);

	// Close panel if selected block gets deleted
	useEffect(() => {
		if (selectedBlockId && !todayBlocks.find((b) => b.id === selectedBlockId)) {
			setSelectedBlockId(null);
		}
	}, [todayBlocks, selectedBlockId]);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
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
		if (task) setActiveDragTask(task);
	}, []);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			setActiveDragTask(null);
			const { active, over } = event;
			if (!over) return;
			const block = over.data.current?.block as TimeBlock | undefined;
			if (!block) return;
			await onScheduleTask(active.id as string, block.start_time);
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

	return (
		// h-full — fills whatever <main> gives it, no hardcoded viewport math
		<DndContext
			sensors={sensors}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			collisionDetection={pointerWithin}
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

				{/* Body — min-h-0 is critical so flex children can shrink and scroll */}
				<div className="flex flex-1 min-h-0">
					{/* Timeline column */}
					<div className="flex flex-1 border-r border-border min-h-0">
						{/* Time labels — hidden scrollbar, driven by timeline scroll */}
						<div
							ref={labelsScrollRef}
							className="w-16 shrink-0 border-r border-border bg-muted/30"
							style={{ overflowY: "hidden" }}
						>
							<div style={{ height: TOTAL_HEIGHT }}>
								{Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => {
									const hour = DAY_START_HOUR + i;
									return (
										<div
											key={hour}
											className="text-xs text-muted-foreground text-right pr-2 pt-2"
											style={{ height: PIXELS_PER_HOUR }}
										>
											{hour === 0
												? "12 am"
												: hour < 12
													? `${hour} am`
													: hour === 12
														? "12 pm"
														: `${hour - 12} pm`}{" "}
										</div>
									);
								})}
							</div>
						</div>

						{/* Scrollable timeline */}
						<div
							ref={timelineScrollRef}
							className="flex-1 overflow-y-auto"
							onScroll={handleTimelineScroll}
						>
							<div className="relative" style={{ height: TOTAL_HEIGHT }}>
								{/* Hour grid lines */}
								{Array.from({ length: TOTAL_HOURS }).map((_, i) => (
									<div
										key={i}
										className="absolute w-full border-t border-border/30"
										style={{ top: (i + 1) * PIXELS_PER_HOUR }}
									/>
								))}

								{/* Time blocks */}
								{todayBlocks.map((block) => (
									<TimeBlockCard
										key={block.id}
										block={block}
										tasks={dayTasks}
										completedTasks={dayCompletedTasks}
										onUpdateBlock={onUpdateBlock}
										onDeleteBlock={onDeleteBlock}
										onStartTask={onStartTask}
										onSelect={setSelectedBlockId}
									/>
								))}

								{/* Empty slots */}
								{Array.from({ length: TOTAL_HOURS }).map((_, i) => {
									const hour = DAY_START_HOUR + i;
									const hasBlock = todayBlocks.some((b) => {
										const bStart = new Date(b.start_time).getHours();
										const bEnd = new Date(b.end_time).getHours();
										return bStart <= hour && bEnd > hour;
									});
									if (hasBlock) return null;
									return (
										<EmptySlot
											key={hour}
											hour={hour}
											onCreateBlock={handleCreateBlock}
										/>
									);
								})}
							</div>
						</div>
					</div>

					{/* Sidebar */}
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
						<div className="w-80 shrink-0 flex flex-col min-h-0 bg-card">
							<div className="p-4 border-b border-border shrink-0">
								<h3 className="font-medium">Unscheduled</h3>
								<p className="text-sm text-muted-foreground">
									{unscheduledTasks.length} tasks • Drag to schedule
								</p>
							</div>
							<div className="flex-1 overflow-y-auto p-3 space-y-2">
								{unscheduledTasks.length === 0 ? (
									<p className="text-sm text-muted-foreground text-center py-8">
										All tasks scheduled! 🎉
									</p>
								) : (
									unscheduledTasks.map((task) => (
										<DraggableTaskItem
											key={task.id}
											task={task}
											onStart={onStartTask}
										/>
									))
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Drag overlay — renders outside the scroll container so it's never clipped */}
			<DragOverlay dropAnimation={{ duration: 150, easing: "ease-out" }}>
				{activeDragTask && (
					<div className="w-64 shadow-2xl rounded-md border border-[#8b9a6b] bg-background px-3 py-2 text-sm font-medium text-foreground rotate-1 opacity-95 pointer-events-none">
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 rounded-full bg-[#8b9a6b] shrink-0" />
							<span className="truncate">{activeDragTask.text}</span>
						</div>
					</div>
				)}
			</DragOverlay>
		</DndContext>
	);
}
