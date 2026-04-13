import { useState, useMemo } from "react";
import type { Habit } from "@/lib/db/habits";
import { getStreak, getToday, isCompletedOn } from "@/lib/db/habits";
import { Target, Flame, Check, TrendingUp, Calendar } from "lucide-react";
import { HabitCard } from "./habit-card";

interface DashboardViewProps {
	habits: Habit[];
	search: string;
	onHabitClick: (h: Habit) => void;
	onToggleToday: (id: string) => void;
	onToggleDate: (id: string, date: string) => void;
	onReorder: (draggedId: string, targetId: string) => void;
}

export function DashboardView({
	habits,
	search,
	onHabitClick,
	onToggleToday,
	onToggleDate,
	onReorder,
}: DashboardViewProps) {
	const today = getToday();

	const [draggedId, setDraggedId] = useState<string | null>(null);
	const [overId, setOverId] = useState<string | null>(null);

	const stats = useMemo(() => {
		const total = habits.length;
		const active = habits.filter((h) => h.status === "active").length;
		const doneToday = habits.filter(
			(h) => h.status === "active" && isCompletedOn(h, today),
		).length;
		const longestStreak = Math.max(0, ...habits.map(getStreak));
		return { total, active, doneToday, longestStreak };
	}, [habits, today]);

	const activeHabits = useMemo(
		() => habits.filter((h) => h.status === "active"),
		[habits],
	);

	const filteredHabits = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return [];
		return habits.filter(
			(h) =>
				h.name.toLowerCase().includes(q) ||
				(h.description ?? "").toLowerCase().includes(q),
		);
	}, [habits, search]);

	const isSearching = search.trim().length > 0;

	return (
		<div className="px-4 sm:px-6 py-6 pb-10 space-y-8">
			{/* Stats */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				{[
					{
						label: "Total",
						value: stats.total,
						icon: Target,
						color: "text-foreground",
						bg: "bg-secondary/60",
					},
					{
						label: "Active",
						value: stats.active,
						icon: Flame,
						color: "text-sky-500",
						bg: "bg-sky-500/10",
					},
					{
						label: "Done Today",
						value: stats.doneToday,
						icon: Check,
						color: "text-[#8b9a6b]",
						bg: "bg-[#8b9a6b]/10",
					},
					{
						label: "Best Streak",
						value: stats.longestStreak,
						icon: TrendingUp,
						color: "text-amber-500",
						bg: "bg-amber-500/10",
					},
				].map(({ label, value, icon: Icon, color, bg }) => (
					<div
						key={label}
						className={`${bg} rounded-xl p-4 flex flex-col gap-2`}
					>
						<Icon className={`w-4 h-4 ${color}`} />
						<p className={`text-2xl font-bold ${color}`}>{value}</p>
						<p className="text-[11px] text-muted-foreground/70 uppercase tracking-wider">
							{label}
						</p>
					</div>
				))}
			</div>

			{/* Search results */}
			{isSearching && filteredHabits.length > 0 && (
				<div className="space-y-3">
					<h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
						Search Results
					</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{filteredHabits.map((h) => (
							<HabitCard
								key={h.id}
								habit={h}
								onClick={() => onHabitClick(h)}
								onToggle={(e) => {
									e.stopPropagation();
									onToggleToday(h.id);
								}}
								onToggleDate={(date) => onToggleDate(h.id, date)}
								showMiniCalendar
							/>
						))}
					</div>
				</div>
			)}

			{/* Active Habits */}
			{activeHabits.length > 0 && (
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<Calendar className="w-3.5 h-3.5 text-sky-500" />
						<h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
							Today's Habits
						</h3>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
						{activeHabits.map((h) => (
							<div
								key={h.id}
								onDragEnd={() => {
									if (overId && overId !== draggedId)
										onReorder(draggedId!, overId);
									setDraggedId(null);
									setOverId(null);
								}}
								onDragOver={(e) => {
									e.preventDefault();
									e.dataTransfer.dropEffect = "move";
									if (draggedId && h.id !== draggedId) setOverId(h.id);
								}}
								onDragLeave={() => {
									if (overId === h.id) setOverId(null);
								}}
								onDrop={(e) => e.preventDefault()}
								className={`transition-all
									${draggedId === h.id ? "opacity-40" : "opacity-100"}
									${overId === h.id && draggedId !== h.id ? "ring-2 ring-foreground scale-[1.02] rounded-xl" : ""}`}
							>
								<HabitCard
									habit={h}
									onClick={() => onHabitClick(h)}
									onToggle={(e) => {
										e.stopPropagation();
										onToggleToday(h.id);
									}}
									onToggleDate={(date) => onToggleDate(h.id, date)}
									onDragStart={(e) => {
										setDraggedId(h.id);
										e.dataTransfer.effectAllowed = "move";
									}}
									showMiniCalendar
								/>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
