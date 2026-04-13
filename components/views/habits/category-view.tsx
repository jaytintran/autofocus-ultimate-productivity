import { useState, useMemo } from "react";
import type { Habit, HabitStatus } from "@/lib/db/habits";
import { STATUS_CONFIG } from "./constants";
import { HabitCard } from "./habit-card";

interface CategoryViewProps {
	category: string;
	habits: Habit[];
	search: string;
	onHabitClick: (h: Habit) => void;
	onToggleToday: (id: string) => void;
	onToggleDate: (id: string, date: string) => void;
	onReorder: (draggedId: string, targetId: string) => void;
}

export function CategoryView({
	category,
	habits,
	search,
	onHabitClick,
	onToggleToday,
	onToggleDate,
	onReorder,
}: CategoryViewProps) {
	const [draggedId, setDraggedId] = useState<string | null>(null);
	const [overId, setOverId] = useState<string | null>(null);

	const filtered = useMemo(() => {
		if (!search.trim()) return habits;
		const q = search.toLowerCase();
		return habits.filter(
			(h) =>
				h.name.toLowerCase().includes(q) ||
				(h.description ?? "").toLowerCase().includes(q),
		);
	}, [habits, search]);

	const grouped = useMemo(() => {
		const order: HabitStatus[] = ["active", "paused", "archived"];
		const map = new Map<HabitStatus, Habit[]>();
		order.forEach((s) => map.set(s, []));
		filtered.forEach((h) => map.get(h.status)?.push(h));
		return order
			.filter((s) => map.get(s)!.length > 0)
			.map((s) => ({
				status: s,
				habits: map.get(s)!,
			}));
	}, [filtered]);

	return (
		<div className="px-4 sm:px-6 py-6 pb-10 space-y-8">
			<div className="space-y-1">
				<h2 className="text-lg font-semibold text-foreground">{category}</h2>
				<p className="text-xs text-muted-foreground/60">
					{filtered.length} {filtered.length === 1 ? "habit" : "habits"}
				</p>
			</div>

			{filtered.length === 0 && (
				<p className="text-sm text-muted-foreground">
					No habits match your search.
				</p>
			)}

			{grouped.map(({ status, habits: statusHabits }) => {
				const cfg = STATUS_CONFIG[status];
				return (
					<div key={status} className="space-y-3">
						<div className="flex items-center gap-2">
							<div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
							<h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
								{cfg.label}
							</h3>
							<div className="flex-1 h-px bg-border/40" />
							<span className="text-[10px] text-muted-foreground/40">
								{statusHabits.length}
							</span>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
							{statusHabits.map((h) => (
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
				);
			})}
		</div>
	);
}
