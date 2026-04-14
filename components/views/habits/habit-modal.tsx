import { useState } from "react";
import type { Habit, HabitStatus } from "@/lib/db/habits";
import {
	getStreak,
	getLast66Days,
	getToday,
	isCompletedOn,
} from "@/lib/db/habits";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flame, Check, X } from "lucide-react";
import { STATUS_CONFIG, HABIT_COLORS } from "./constants";

interface HabitModalProps {
	habit: Habit;
	onClose: () => void;
	onUpdate: (id: string, updates: Partial<Habit>) => Promise<void>;
	onDelete: (id: string) => Promise<void>;
	onToggleToday: () => void;
}

export function HabitModal({
	habit,
	onClose,
	onUpdate,
	onDelete,
	onToggleToday,
}: HabitModalProps) {
	const [name, setName] = useState(habit.name);
	const [description, setDescription] = useState(habit.description ?? "");
	const [targetDays, setTargetDays] = useState(habit.target_days.toString());
	const [color, setColor] = useState(habit.color || "#8b9a6b");
	const [isSaving, setIsSaving] = useState(false);
	const [localStatus, setLocalStatus] = useState<HabitStatus>(habit.status);

	const streak = getStreak(habit);
	const history66 = getLast66Days(habit);
	const today = getToday();
	const isDoneToday = isCompletedOn(habit, today);

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await onUpdate(habit.id, {
				name: name.trim(),
				description: description.trim() || null,
				target_days: Math.min(7, Math.max(1, parseInt(targetDays) || 1)),
				color,
				status: localStatus,
			});
			onClose();
		} finally {
			setIsSaving(false);
		}
	};


	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[580px] max-w-[calc(100vw-2rem)] p-0 overflow-hidden max-h-[90vh] flex flex-col">
				<div className="px-6 pt-5 pb-4 flex-shrink-0">
					<DialogHeader>
						<div className="flex items-center justify-between gap-3">
							{/* Right side icons: Toggle, Streak, Close */}
							<div className="flex items-center gap-2 flex-shrink-0">
								{/* Toggle Circle */}
								<button
									onClick={onToggleToday}
									className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
										isDoneToday
											? "bg-foreground text-background"
											: "border-2 border-border hover:border-foreground/30"
									}`}
									style={isDoneToday ? { backgroundColor: color } : {}}
									title={isDoneToday ? "Completed today" : "Mark done today"}
								>
									{isDoneToday && <Check className="w-4 h-4" />}
								</button>
							</div>
							<DialogTitle className="flex-1 min-w-0">
								<input
									value={name}
									onChange={(e) => setName(e.target.value)}
									className="w-full text-base font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-ring focus:outline-none transition-colors"
								/>
							</DialogTitle>
						</div>
					</DialogHeader>

					{/* Frequency info */}
					<div className="mt-2">
						<span className="text-[10px] text-muted-foreground/50">
							{habit.frequency === "daily"
								? "Daily"
								: `${habit.target_days}x per week`}
						</span>
					</div>

					{/* Status selector */}
					<div className="flex items-center gap-1.5 mt-3 flex-wrap">
						{(Object.keys(STATUS_CONFIG) as HabitStatus[]).map((s) => {
							const cfg = STATUS_CONFIG[s];
							return (
								<button
									key={s}
									type="button"
									onClick={() => setLocalStatus(s)}
									className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
										localStatus === s
											? `border-foreground/30 bg-foreground/10 ${cfg.text}`
											: "border-border text-muted-foreground hover:border-foreground/20"
									}`}
								>
									{cfg.label}
								</button>
							);
						})}
					</div>
				</div>

				<div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 border-t border-border/60 pt-4 bg-secondary/20">
					{/* 66-Day Heatmap */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
								Last 66 Days
							</label>
							<span className="text-[10px] text-muted-foreground/40">
								{history66.filter((d) => d.completed).length} completed
							</span>
						</div>
						<div className="grid grid-cols-[repeat(auto-fit,minmax(8px,1fr))] gap-1">
							{history66.map((day) => (
								<div
									key={day.date}
									title={day.date}
									className={`w-full aspect-square rounded-sm ${
										day.completed ? "" : "bg-muted"
									}`}
									style={day.completed ? { backgroundColor: color } : {}}
								/>
							))}
						</div>
					</div>

					{/* Description */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Description
						</label>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="What is this habit about..."
							rows={2}
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
						/>
					</div>

					{/* Target Days */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Target Days Per Week (1-7)
						</label>
						<input
							type="number"
							min="1"
							max="7"
							value={targetDays}
							onChange={(e) => setTargetDays(e.target.value)}
							className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
						/>
					</div>

					{/* Color Picker */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Color
						</label>
						<div className="flex flex-wrap gap-2">
							{HABIT_COLORS.map((c) => (
								<button
									key={c.value}
									onClick={() => setColor(c.value)}
									className={`w-8 h-8 rounded-full border-2 transition-all ${
										color === c.value
											? "border-foreground scale-110"
											: "border-transparent hover:scale-105"
									}`}
									style={{ backgroundColor: c.value }}
									title={c.name}
								/>
							))}
						</div>
					</div>

					{/* Actions */}
					<div className="flex items-center justify-between pt-1">
						<button
							type="button"
							onClick={async () => {
								onClose();
								await onDelete(habit.id);
							}}
							className="text-xs text-muted-foreground/50 hover:text-destructive transition-colors"
						>
							Delete habit
						</button>
						<div className="flex gap-2">
							<Button variant="outline" size="sm" onClick={onClose}>
								Cancel
							</Button>
							<Button size="sm" onClick={handleSave} disabled={isSaving}>
								{isSaving ? "Saving..." : "Save"}
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
