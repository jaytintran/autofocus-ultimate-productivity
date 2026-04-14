import { useMemo, useState } from "react";
import type { Habit } from "@/lib/db/habits";
import {
	getStreak,
	getWeeklyProgress,
	getToday,
	isCompletedOn,
} from "@/lib/db/habits";
import {
	Flame,
	Check,
	GripHorizontal,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { STATUS_CONFIG } from "./constants";
import { formatStreak, getWeekDays } from "./utils";

interface HabitCardProps {
	habit: Habit;
	onClick: () => void;
	onToggle: (e: React.MouseEvent) => void;
	onToggleDate?: (date: string) => void;
	onDragStart?: (e: React.DragEvent) => void;
	showMiniCalendar?: boolean;
}

export function HabitCard({
	habit,
	onClick,
	onToggle,
	onToggleDate,
	onDragStart,
	showMiniCalendar = false,
}: HabitCardProps) {
	const [weekOffset, setWeekOffset] = useState(0);
	const streak = getStreak(habit);
	const weekly = getWeeklyProgress(habit);
	const today = getToday();
	const isDoneToday = isCompletedOn(habit, today);
	const status = STATUS_CONFIG[habit.status];
	const color = habit.color || "#8b9a6b";

	// Get 7 days for mini view based on week offset
	const displayedDays = useMemo(() => {
		const days = [];
		for (let i = 6; i >= 0; i--) {
			const d = new Date();
			d.setDate(d.getDate() - i + weekOffset * 7);
			days.push(d.toISOString().split("T")[0]);
		}
		return days;
	}, [weekOffset]);

	const weekLabels = getWeekDays();

	return (
		<div className="group relative bg-card border border-border rounded-xl p-4 hover:border-border/80 hover:bg-accent/30 transition-all duration-150 flex flex-col gap-3">
			{/* Drag Handle */}
			{onDragStart && (
				<div
					draggable
					onDragStart={onDragStart}
					className="absolute px-3 left-1/2 top-1 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 bg-card rounded hover:bg-accent"
					title="Drag to reorder"
				>
					<GripHorizontal className="w-5 h-5 text-muted-foreground" />
				</div>
			)}

			{/* Header: Status + Toggle */}
			<div className="flex items-center justify-between gap-2">
				<div
					className={`flex items-center gap-1.5 text-[10px] font-medium ${status.text}`}
				>
					<div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
					{status.label}
				</div>

				<button
					onClick={onToggle}
					className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
						isDoneToday
							? "bg-foreground text-background"
							: "border-2 border-border hover:border-foreground/30"
					}`}
					style={isDoneToday ? { backgroundColor: color } : {}}
				>
					{isDoneToday && <Check className="w-4 h-4" />}
				</button>
			</div>

			{/* Title */}
			<div onClick={onClick} className="cursor-pointer flex-1 min-w-0">
				<p
					className={`max-sm:text-xs text-sm font-medium leading-snug ${
						habit.status === "archived"
							? "text-muted-foreground"
							: "text-foreground"
					}`}
				>
					{habit.name}
				</p>
				{habit.description && (
					<p className="text-[11px] text-muted-foreground/60 mt-0.5 line-clamp-1 max-sm:hidden">
						{habit.description}
					</p>
				)}
			</div>

			{/* Streak + Weekly Progress */}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5">
					<Flame
						className="w-3.5 h-3.5"
						style={{
							color: streak > 0 ? "#f59e0b" : "hsl(var(--muted-foreground))",
						}}
					/>
					<span
						className={`text-[11px] font-medium ${
							streak > 0 ? "text-amber-500" : "text-muted-foreground/50"
						}`}
					>
						{formatStreak(streak)}
					</span>
				</div>

				<div className="flex items-center gap-1.5">
					<span className="text-[10px] text-muted-foreground/40">
						{weekly.completed}/{weekly.target}
					</span>
					<div className="w-12 h-1 bg-secondary rounded-full overflow-hidden">
						<div
							className="h-full rounded-full transition-all"
							style={{
								width: `${Math.min(100, (weekly.completed / weekly.target) * 100)}%`,
								backgroundColor: color,
							}}
						/>
					</div>
				</div>
			</div>

			{/* Mini 7-day calendar */}
			{showMiniCalendar && (
				<div className="pt-2 border-border/40 max-sm:hidden">
					<div className="flex items-center justify-between gap-2">
						<button
							onClick={(e) => {
								e.stopPropagation();
								setWeekOffset(weekOffset - 1);
							}}
							className="p-1 hover:bg-accent rounded transition-colors"
							title="Previous week"
						>
							<ChevronLeft className="w-3 h-3 text-muted-foreground" />
						</button>

						<div className="flex items-center justify-between flex-1">
							{displayedDays.map((date, idx) => {
								const completed = habit.completions.includes(date);
								const isToday = date === today;
								return (
									<button
										key={date}
										onClick={(e) => {
											e.stopPropagation();
											onToggleDate?.(date);
										}}
										className="flex flex-col items-center gap-1 hover:opacity-70 transition-opacity cursor-pointer"
										title={`${completed ? "Unmark" : "Mark"} ${date}`}
									>
										<div
											className={`w-7 h-1 rounded-[10px] ${
												completed
													? ""
													: isToday
														? "border border-dashed border-border"
														: "bg-muted/50"
											}`}
											style={completed ? { backgroundColor: color } : {}}
										/>
										<span
											className={`text-[8px] ${
												isToday
													? "text-foreground font-medium"
													: "text-muted-foreground/40"
											}`}
										>
											{weekLabels[idx]}
										</span>
									</button>
								);
							})}
						</div>

						<button
							onClick={(e) => {
								e.stopPropagation();
								setWeekOffset(weekOffset + 1);
							}}
							className="p-1 hover:bg-accent rounded transition-colors"
							title="Next week"
						>
							<ChevronRight className="w-3 h-3 text-muted-foreground" />
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
