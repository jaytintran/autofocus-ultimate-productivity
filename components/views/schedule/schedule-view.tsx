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
	pointerWithin,
	TouchSensor,
} from "@dnd-kit/core";

import { format, isSameDay, addMinutes, isToday, addDays } from "date-fns";
import type { Task } from "@/lib/types";
import { Plus, ChevronLeft, ChevronRight, X, Search } from "lucide-react";

import { useDebounce } from "./use-debounce";
import type { ScheduleViewProps, ContextMenuState } from "./types";
import {
	PIXELS_PER_HOUR,
	SNAP_MINUTES,
	PIXELS_PER_MINUTE,
	DAY_START_HOUR,
	TOTAL_HOURS,
	TOTAL_HEIGHT,
} from "./constants";
import { computeBlockLayout } from "./utils";
import { SchedulableTaskItem } from "./schedulable-task-item";
import { BlockContextMenu } from "./block-context-menu";
import { TimeBlockCard } from "./time-block-card";
import { BlockDetailPanel } from "./block-detail-panel";
import { CurrentTimeIndicator } from "./current-time-indicator";

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

	const handleLabelsScroll = useCallback(() => {
		if (labelsScrollRef.current && timelineScrollRef.current) {
			timelineScrollRef.current.scrollTop = labelsScrollRef.current.scrollTop;
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

	const [searchQuery, setSearchQuery] = useState("");
	const debouncedQuery = useDebounce(searchQuery, 200);

	const filteredUnscheduledTasks = useMemo(() => {
		if (!debouncedQuery.trim()) return unscheduledTasks;
		const q = debouncedQuery.toLowerCase();
		return unscheduledTasks.filter((t) => t.text.toLowerCase().includes(q));
	}, [unscheduledTasks, debouncedQuery]);

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
			const block = over.data.current?.block;
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
		(e: React.MouseEvent, block: any) => {
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
							className="w-14 md:w-16 shrink-0 border-r border-border bg-muted/30 [&::-webkit-scrollbar]:hidden"
							style={{ overflowY: "scroll", scrollbarWidth: "none" }}
							onScroll={handleLabelsScroll}
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
							className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full"
							onScroll={handleTimelineScroll}
							style={{
								scrollbarWidth: "thin",
								scrollbarColor: "rgba(128,128,128,0.2) transparent",
							}}
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

						{/* Floating controls — top right */}
						<div className="absolute top-3 right-3 z-20 flex items-center gap-2">
							{/* Date navigator */}
							<div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm border border-border rounded-full shadow-lg px-2 py-1">
								<button
									onClick={() => onDateChange(addDays(date, -1))}
									className="p-1 hover:bg-accent rounded-full transition-colors"
								>
									<ChevronLeft className="w-3.5 h-3.5" />
								</button>
								<button
									onClick={() =>
										isToday(date) ? null : onDateChange(new Date())
									}
									className="text-xs font-medium px-2 min-w-[80px] text-center"
								>
									{isToday(date) ? "Today" : format(date, "EEE, MMM d")}
								</button>
								<button
									onClick={() => onDateChange(addDays(date, 1))}
									className="p-1 hover:bg-accent rounded-full transition-colors"
								>
									<ChevronRight className="w-3.5 h-3.5" />
								</button>
							</div>

							{/* Add block button */}
							<button
								onClick={() => handleCreateBlock(new Date().getHours())}
								className="flex items-center justify-center w-7 h-7 rounded-full bg-af4-olive hover:bg-af4-olive-muted shadow-lg text-card transition-colors"
							>
								<Plus className="w-3.5 h-3.5" />
							</button>
						</div>
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
										{unscheduledTasks.length} Tasks • Tap Clock to Schedule
									</p>

									<div className="relative mt-2">
										<Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
										<input
											type="text"
											placeholder="Search tasks..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											className="w-full pl-7 pr-7 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-[#8b9a6b]"
										/>
										{searchQuery && (
											<button
												onClick={() => setSearchQuery("")}
												className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
											>
												<X className="w-3.5 h-3.5" />
											</button>
										)}
									</div>
								</div>
								<div
									className="flex-1 overflow-y-auto p-3 space-y-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full"
									style={{
										scrollbarWidth: "thin",
										scrollbarColor: "rgba(128,128,128,0.2) transparent",
									}}
								>
									{filteredUnscheduledTasks.length === 0 ? (
										<p className="text-sm text-muted-foreground text-center py-8">
											{debouncedQuery
												? "No tasks match your search"
												: "All tasks scheduled! 🎉"}
										</p>
									) : (
										filteredUnscheduledTasks.map((task) => (
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
								{unscheduledTasks.length} Tasks • Tap Clock to Schedule
							</p>

							<div className="relative mt-2">
								<Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
								<input
									type="text"
									placeholder="Search tasks..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full pl-7 pr-7 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-[#8b9a6b]"
								/>
								{searchQuery && (
									<button
										onClick={() => setSearchQuery("")}
										className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									>
										<X className="w-3.5 h-3.5" />
									</button>
								)}
							</div>
						</div>
						<div className="flex-1 overflow-y-auto p-3 space-y-2">
							{filteredUnscheduledTasks.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-8">
									{debouncedQuery
										? "No tasks match your search"
										: "All tasks scheduled! 🎉"}
								</p>
							) : (
								filteredUnscheduledTasks.map((task) => (
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
