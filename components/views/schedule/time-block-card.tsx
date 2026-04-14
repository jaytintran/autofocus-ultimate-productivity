import { useState, useRef, useEffect, useMemo } from "react";
import { format } from "date-fns";
import type { Task, TimeBlock } from "@/lib/types";
import { X } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { PIXELS_PER_MINUTE, SNAP_MINUTES } from "./constants";
import { isTaskInBlock, getTaskScheduledTime } from "./utils";

export function TimeBlockCard({
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
		e.stopPropagation();
		const startY = e.clientY;
		const startX = e.clientX;
		let resizeCommitted = false;

		const blockEnd = new Date(block.end_time);
		resizeStartRef.current = {
			y: startY,
			endMinutes: blockEnd.getHours() * 60 + blockEnd.getMinutes(),
		};

		const onMove = (ev: PointerEvent) => {
			if (!resizeStartRef.current) return;

			if (!resizeCommitted) {
				const deltaY = Math.abs(ev.clientY - startY);
				const deltaX = Math.abs(ev.clientX - startX);
				if (deltaY < 6) return;
				if (deltaX > deltaY) {
					resizeStartRef.current = null;
					window.removeEventListener("pointermove", onMove);
					window.removeEventListener("pointerup", onUp);
					return;
				}
				resizeCommitted = true;
				ev.preventDefault();
				onDragBlockStart();
			}

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
			if (!resizeStartRef.current || !resizeCommitted) {
				resizeStartRef.current = null;
				window.removeEventListener("pointermove", onMove);
				window.removeEventListener("pointerup", onUp);
				return;
			}
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
		e.stopPropagation();
		const startY = e.clientY;
		const startX = e.clientX;
		let resizeCommitted = false;

		const blockStart = new Date(block.start_time);
		resizeTopStartRef.current = {
			y: startY,
			startMinutes: blockStart.getHours() * 60 + blockStart.getMinutes(),
		};

		const onMove = (ev: PointerEvent) => {
			if (!resizeTopStartRef.current) return;

			if (!resizeCommitted) {
				const deltaY = Math.abs(ev.clientY - startY);
				const deltaX = Math.abs(ev.clientX - startX);
				if (deltaY < 6) return;
				if (deltaX > deltaY) {
					resizeTopStartRef.current = null;
					window.removeEventListener("pointermove", onMove);
					window.removeEventListener("pointerup", onUp);
					return;
				}
				resizeCommitted = true;
				ev.preventDefault();
				onDragBlockStart();
			}

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
			if (!resizeTopStartRef.current || !resizeCommitted) {
				resizeTopStartRef.current = null;
				window.removeEventListener("pointermove", onMove);
				window.removeEventListener("pointerup", onUp);
				return;
			}
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

		const LONG_PRESS_MS = 500;
		const startClientY = e.clientY;
		const startClientX = e.clientX;

		const cancel = () => {
			clearTimeout(timer);
			window.removeEventListener("pointerup", cancel);
			window.removeEventListener("pointercancel", cancel);
			window.removeEventListener("pointermove", cancelOnScroll);
		};

		const cancelOnScroll = (ev: PointerEvent) => {
			const deltaY = Math.abs(ev.clientY - startClientY);
			const deltaX = Math.abs(ev.clientX - startClientX);
			if (deltaY > 8 && deltaY > deltaX) {
				cancel();
			}
		};

		const timer = setTimeout(() => {
			window.removeEventListener("pointerup", cancel);
			window.removeEventListener("pointercancel", cancel);
			window.removeEventListener("pointermove", cancelOnScroll);

			setIsPressing(true);
			didLongPressRef.current = true;

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
				onDragBlockEnd();
				didMoveRef.current = false;
				setTimeout(() => {
					didLongPressRef.current = false;
				}, 0);
				setIsPressing(false);

				window.removeEventListener("pointermove", onMove);
				window.removeEventListener("pointerup", onUp);
			};

			window.addEventListener("pointermove", onMove);
			window.addEventListener("pointerup", onUp);
		}, LONG_PRESS_MS);

		window.addEventListener("pointerup", cancel);
		window.addEventListener("pointercancel", cancel);
		window.addEventListener("pointermove", cancelOnScroll);
	};

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
				userSelect: "none",
				WebkitUserSelect: "none",
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
