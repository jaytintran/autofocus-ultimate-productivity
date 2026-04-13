"use client";

import { useMemo, useState } from "react";
import { Flame, Check } from "lucide-react";
import type { Habit } from "@/lib/db/habits";
import {
	getStreak,
	getToday,
	isCompletedOn,
	getWeeklyProgress,
} from "@/lib/db/habits";

function getLast7Days(): string[] {
	return Array.from({ length: 7 }, (_, i) => {
		const d = new Date();
		d.setDate(d.getDate() - (6 - i));
		return d.toISOString().split("T")[0];
	});
}

const WEEK_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function getWeekLabels(): string[] {
	const today = new Date().getDay();
	return Array.from({ length: 7 }, (_, i) => {
		return WEEK_LABELS[(today - (6 - i) + 7) % 7];
	});
}

interface HabitGridProps {
	habits: Habit[];
	onToggle: (id: string) => void;
	onReorder: (draggedId: string, targetId: string) => void;
}

export function HabitGrid({ habits, onToggle, onReorder }: HabitGridProps) {
	const today = getToday();
	const activeHabits = useMemo(
		() => habits.filter((h) => h.status === "active"),
		[habits],
	);

	const [draggedId, setDraggedId] = useState<string | null>(null);
	const [overId, setOverId] = useState<string | null>(null);

	if (activeHabits.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
				<Flame className="w-8 h-8 opacity-20" />
				<p className="text-sm">No active habits yet.</p>
			</div>
		);
	}

	return (
		<div className="px-4 py-4 md:px-10">
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				{activeHabits.map((habit) => {
					const isDone = isCompletedOn(habit, today);
					const streak = getStreak(habit);
					const weekly = getWeeklyProgress(habit);
					const color = habit.color || "#8b9a6b";
					const isDragging = draggedId === habit.id;
					const isOver = overId === habit.id && draggedId !== habit.id;

					return (
						<div
							key={habit.id}
							draggable
							onDragStart={(e) => {
								setDraggedId(habit.id);
								e.dataTransfer.effectAllowed = "move";
							}}
							onDragEnd={() => {
								if (overId && overId !== draggedId) {
									onReorder(draggedId!, overId);
								}
								setDraggedId(null);
								setOverId(null);
							}}
							onDragOver={(e) => {
								e.preventDefault();
								e.dataTransfer.dropEffect = "move";
								if (draggedId && habit.id !== draggedId) {
									setOverId(habit.id);
								}
							}}
							onDragLeave={() => {
								if (overId === habit.id) setOverId(null);
							}}
							onDrop={(e) => {
								e.preventDefault();
							}}
							className={`relative flex flex-col gap-2 rounded-2xl border p-3 text-left cursor-grab active:cursor-grabbing transition-all
                ${isDragging ? "opacity-40" : "opacity-100"}
                ${isOver ? "ring-2 ring-foreground scale-[1.02]" : ""}
                ${
									isDone
										? "border-transparent"
										: "border-border hover:border-border/80 hover:bg-accent/30"
								}`}
							style={
								isDone
									? { borderColor: `${color}40`, backgroundColor: `${color}10` }
									: {}
							}
						>
							{/* Done checkmark */}
							<div className="flex items-center justify-between">
								<div
									onClick={(e) => {
										e.stopPropagation();
										onToggle(habit.id);
									}}
									className={`w-5 h-5 rounded-full flex items-center justify-center transition-all flex-shrink-0 cursor-pointer
                    ${isDone ? "opacity-100" : "border border-border opacity-40 hover:opacity-70"}`}
									style={isDone ? { backgroundColor: color } : {}}
								>
									{isDone && <Check className="w-3 h-3 text-white" />}
								</div>

								{streak > 0 && (
									<span className="flex items-center gap-0.5 text-[10px] text-amber-500">
										<Flame className="w-3 h-3" />
										{streak}
									</span>
								)}
							</div>

							{/* Name */}
							<p
								className={`text-xs font-medium leading-snug line-clamp-2 ${isDone ? "text-foreground" : "text-foreground/70"}`}
							>
								{habit.name}
							</p>

							{/* Category */}
							<p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider truncate">
								{habit.category}
							</p>

							{/* Weekly progress bar */}
							<div className="w-full h-0.5 bg-border rounded-full overflow-hidden">
								<div
									className="h-full rounded-full transition-all"
									style={{
										width: `${Math.min(100, (weekly.completed / weekly.target) * 100)}%`,
										backgroundColor: color,
									}}
								/>
							</div>

							{/* Weekly count */}
							<p className="text-[10px] text-muted-foreground/50">
								{weekly.completed}/{weekly.target} this week
							</p>

							{/* 7-day strip — desktop only */}
							<div className="hidden md:block pt-2 border-t border-border/30">
								<div className="flex items-end justify-between gap-1">
									{getLast7Days().map((date, idx) => {
										const completed = habit.completions.includes(date);
										const isToday = date === today;
										return (
											<div
												key={date}
												className="flex flex-col items-center gap-1"
											>
												<div
													className={`w-4 h-4 rounded-sm transition-colors ${
														completed
															? ""
															: isToday
																? "border border-dashed border-border"
																: "bg-muted/50"
													}`}
													style={completed ? { backgroundColor: color } : {}}
												/>
												<span
													className={`text-[8px] ${isToday ? "text-foreground font-medium" : "text-muted-foreground/40"}`}
												>
													{getWeekLabels()[idx]}
												</span>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
