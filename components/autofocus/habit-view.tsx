"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useHabits } from "@/hooks/use-habits";
import type { Habit, HabitStatus } from "@/lib/habits";
import {
	getStreak,
	getWeeklyProgress,
	getLast66Days,
	getToday,
	isCompletedOn,
} from "@/lib/habits";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
	Flame,
	Check,
	Plus,
	X,
	LayoutDashboard,
	FolderOpen,
	Search,
	Menu,
	ChevronRight,
	Edit,
	Trash2,
	Target,
	TrendingUp,
	Calendar,
	Pause,
	Archive,
	Circle,
	LucideIcon,
	Laptop2,
	BicepsFlexed,
	Glasses,
	Globe2,
	ShoppingBasket,
	DollarSign,
	Users,
} from "lucide-react";

// ─── Category Icons (reuse from project-view) ─────────────────────────────────

const CATEGORY_ORDER = [
	"software & ai engineering",
	"agency & freelance",
	"day trading",
	"solopreneur & saas",
	"ace of all trades",
	"combatbuilding & superhuman",
	"supermale & alpha",
	"polyglot vagabond",
	"personal brand",
	"e-commerce",
	"business & investment",
	"society & influence",
];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
	"software & ai engineering": Target,
	"agency & freelance": FolderOpen,
	"day trading": TrendingUp,
	"solopreneur & saas": Laptop2,
	"ace of all trades": Target,
	"combatbuilding & superhuman": BicepsFlexed,
	"supermale & alpha": Glasses,
	"polyglot vagabond": Globe2,
	"personal brand": Flame,
	"e-commerce": ShoppingBasket,
	"business & investment": DollarSign,
	"society & influence": Users,
};

function getCategoryIcon(category: string): LucideIcon {
	const lower = category.toLowerCase();
	return CATEGORY_ICONS[lower] ?? FolderOpen;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: {
	[K in HabitStatus]: {
		label: string;
		dot: string;
		text: string;
		bg: string;
	};
} = {
	active: {
		label: "Active",
		dot: "bg-sky-500",
		text: "text-sky-500",
		bg: "bg-sky-500/10",
	},
	paused: {
		label: "Paused",
		dot: "bg-muted-foreground/40",
		text: "text-muted-foreground",
		bg: "bg-muted/50",
	},
	archived: {
		label: "Archived",
		dot: "bg-muted-foreground/20",
		text: "text-muted-foreground/40",
		bg: "bg-muted/30",
	},
};

const HABIT_COLORS = [
	{ name: "Olive", value: "#8b9a6b" },
	{ name: "Sky", value: "#0ea5e9" },
	{ name: "Amber", value: "#f59e0b" },
	{ name: "Rose", value: "#f43f5e" },
	{ name: "Violet", value: "#8b5cf6" },
	{ name: "Emerald", value: "#10b981" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatStreak(streak: number): string {
	if (streak === 0) return "0";
	if (streak === 1) return "1 day";
	return `${streak} days`;
}

function getWeekDays(): string[] {
	const days = ["S", "M", "T", "W", "T", "F", "S"];
	const now = new Date();
	const currentDay = now.getDay();
	// Reorder so today is last
	const reordered = [];
	for (let i = 6; i >= 0; i--) {
		const idx = (currentDay - i + 7) % 7;
		reordered.push(days[idx]);
	}
	return reordered;
}

// ─── Habit Card ──────────────────────────────────────────────────────────────

function HabitCard({
	habit,
	onClick,
	onToggle,
	showMiniCalendar = false,
}: {
	habit: Habit;
	onClick: () => void;
	onToggle: (e: React.MouseEvent) => void;
	showMiniCalendar?: boolean;
}) {
	const streak = getStreak(habit);
	const weekly = getWeeklyProgress(habit);
	const today = getToday();
	const isDoneToday = isCompletedOn(habit, today);
	const status = STATUS_CONFIG[habit.status];
	const color = habit.color || "#8b9a6b";

	// Get last 7 days for mini view
	const last7Days = useMemo(() => {
		const days = [];
		for (let i = 6; i >= 0; i--) {
			const d = new Date();
			d.setDate(d.getDate() - i);
			days.push(d.toISOString().split("T")[0]);
		}
		return days;
	}, []);

	const weekLabels = getWeekDays();

	return (
		<div className="group relative bg-card border border-border rounded-xl p-4 hover:border-border/80 hover:bg-accent/30 transition-all duration-150 flex flex-col gap-3">
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
				<div className="pt-2 border-t border-border/40 max-sm:hidden">
					<div className="flex items-center justify-between">
						{last7Days.map((date, idx) => {
							const completed = habit.completions.includes(date);
							const isToday = date === today;
							return (
								<div key={date} className="flex flex-col items-center gap-1">
									<div
										className={`w-5 h-5 rounded-sm ${
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
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}

// ─── Habit Detail Modal ─────────────────────────────────────────────────────

function HabitModal({
	habit,
	onClose,
	onUpdate,
	onDelete,
	onToggleToday,
}: {
	habit: Habit;
	onClose: () => void;
	onUpdate: (id: string, updates: Partial<Habit>) => Promise<void>;
	onDelete: (id: string) => Promise<void>;
	onToggleToday: () => void;
}) {
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

	// Group 66 days into weeks for heatmap
	const weeks = useMemo(() => {
		const w = [];
		for (let i = 0; i < history66.length; i += 7) {
			w.push(history66.slice(i, i + 7));
		}
		return w;
	}, [history66]);

	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[580px] max-w-[calc(100vw-2rem)] p-0 overflow-hidden max-h-[90vh] flex flex-col">
				<div className="px-6 pt-5 pb-4 flex-shrink-0">
					<DialogHeader>
						<DialogTitle className="text-base leading-snug pr-6 text-foreground flex items-center gap-2">
							{habit.name}
							{streak > 0 && (
								<span className="flex items-center gap-1 text-amber-500 text-sm">
									<Flame className="w-4 h-4" />
									{streak}
								</span>
							)}
						</DialogTitle>
					</DialogHeader>

					{/* Quick Toggle Today */}
					<div className="mt-3 flex items-center gap-3">
						<button
							onClick={onToggleToday}
							className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
								isDoneToday
									? "bg-foreground text-background"
									: "border border-border hover:border-foreground/30"
							}`}
							style={isDoneToday ? { backgroundColor: color } : {}}
						>
							{isDoneToday ? (
								<>
									<Check className="w-4 h-4" />
									Completed today
								</>
							) : (
								<>
									<Circle className="w-4 h-4" />
									Mark done today
								</>
							)}
						</button>
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
						<div className="flex gap-1 overflow-x-auto pb-2">
							{weeks.map((week, weekIdx) => (
								<div key={weekIdx} className="flex flex-col gap-1">
									{week.map((day) => (
										<div
											key={day.date}
											title={day.date}
											className={`w-3 h-3 rounded-sm ${
												day.completed ? "" : "bg-muted"
											}`}
											style={day.completed ? { backgroundColor: color } : {}}
										/>
									))}
								</div>
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

// ─── Add Habit Modal ─────────────────────────────────────────────────────────

function AddHabitModal({
	onClose,
	onAdd,
	categories,
}: {
	onClose: () => void;
	onAdd: (
		habit: Omit<Habit, "id" | "created_at" | "updated_at" | "completions">,
	) => Promise<void>;
	categories: string[];
}) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState("");
	const [frequency, setFrequency] = useState<Habit["frequency"]>("daily");
	const [targetDays, setTargetDays] = useState("7");
	const [color, setColor] = useState("#8b9a6b");
	const [saving, setSaving] = useState(false);
	const [showNewCategory, setShowNewCategory] = useState(false);

	const handleSubmit = async () => {
		if (!name.trim() || !category.trim()) return;
		setSaving(true);
		try {
			await onAdd({
				name: name.trim(),
				description: description.trim() || null,
				category: category.trim(),
				frequency,
				target_days: parseInt(targetDays) || 7,
				color,
				status: "active",
			});
			onClose();
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[520px] max-w-[calc(100vw-2rem)] p-0 overflow-hidden max-h-[90vh] flex flex-col">
				<div className="px-6 pt-5 pb-4 flex-shrink-0">
					<DialogHeader>
						<DialogTitle>Add Habit</DialogTitle>
					</DialogHeader>
				</div>

				<div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 border-t border-border/60 pt-4 bg-secondary/20">
					{/* Name */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Name *
						</label>
						<input
							autoFocus
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Habit name"
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
						/>
					</div>

					{/* Description */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Description
						</label>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Brief overview..."
							rows={2}
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
						/>
					</div>

					{/* Category */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Category *
						</label>
						{showNewCategory ? (
							<div className="flex gap-2">
								<input
									autoFocus
									value={category}
									onChange={(e) => setCategory(e.target.value)}
									placeholder="New category name"
									className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
								/>
								<button
									type="button"
									onClick={() => {
										setShowNewCategory(false);
										setCategory("");
									}}
									className="text-xs text-muted-foreground hover:text-foreground"
								>
									Cancel
								</button>
							</div>
						) : (
							<select
								value={category}
								onChange={(e) => {
									if (e.target.value === "__new__") {
										setShowNewCategory(true);
										setCategory("");
									} else {
										setCategory(e.target.value);
									}
								}}
								className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
							>
								<option value="">Select a category...</option>
								{categories.map((c) => (
									<option key={c} value={c}>
										{c}
									</option>
								))}
								<option value="__new__">+ Create new category</option>
							</select>
						)}
					</div>

					{/* Frequency */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Frequency
						</label>
						<div className="flex flex-wrap gap-1.5">
							{(["daily", "weekly"] as const).map((f) => (
								<button
									key={f}
									type="button"
									onClick={() => {
										setFrequency(f);
										setTargetDays(f === "daily" ? "7" : "5");
									}}
									className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
										frequency === f
											? "border-foreground/30 bg-foreground/10 text-foreground"
											: "border-border text-muted-foreground hover:border-foreground/20"
									}`}
								>
									{f === "daily" ? "Daily" : "Weekly"}
								</button>
							))}
						</div>
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
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
						/>
					</div>

					{/* Color */}
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
					<div className="flex justify-end gap-2 pt-1">
						<Button variant="outline" size="sm" onClick={onClose}>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={handleSubmit}
							disabled={saving || !name.trim() || !category.trim()}
						>
							{saving ? "Adding..." : "Add Habit"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// ─── Dashboard View ──────────────────────────────────────────────────────────

function DashboardView({
	habits,
	search,
	onHabitClick,
	onToggleToday,
}: {
	habits: Habit[];
	search: string;
	onHabitClick: (h: Habit) => void;
	onToggleToday: (id: string) => void;
}) {
	const today = getToday();

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
							<HabitCard
								key={h.id}
								habit={h}
								onClick={() => onHabitClick(h)}
								onToggle={(e) => {
									e.stopPropagation();
									onToggleToday(h.id);
								}}
								showMiniCalendar
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

// ─── Category View ───────────────────────────────────────────────────────────

function CategoryView({
	category,
	habits,
	search,
	onHabitClick,
	onToggleToday,
}: {
	category: string;
	habits: Habit[];
	search: string;
	onHabitClick: (h: Habit) => void;
	onToggleToday: (id: string) => void;
}) {
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
								<HabitCard
									key={h.id}
									habit={h}
									onClick={() => onHabitClick(h)}
									onToggle={(e) => {
										e.stopPropagation();
										onToggleToday(h.id);
									}}
									showMiniCalendar
								/>
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
}

// ─── Habit Sidebar ───────────────────────────────────────────────────────────

function HabitSidebar({
	categories,
	habits,
	activeCategory,
	onSelect,
	onAddHabit,
	collapsed,
	onToggleCollapse,
	mobileOpen,
	onMobileClose,
	search,
	setSearch,
}: {
	categories: string[];
	habits: Habit[];
	activeCategory: string;
	onSelect: (c: string) => void;
	onAddHabit: () => void;
	collapsed: boolean;
	onToggleCollapse: () => void;
	mobileOpen: boolean;
	onMobileClose: () => void;
	search: string;
	setSearch: (s: string) => void;
}) {
	const NavItems = ({
		forcedExpanded = false,
	}: {
		forcedExpanded?: boolean;
	}) => {
		const isCollapsed = !forcedExpanded && collapsed;
		return (
			<>
				{/* Overview */}
				<button
					onClick={() => {
						onSelect("__dashboard__");
						onMobileClose();
					}}
					title="Overview"
					className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors
						${activeCategory === "__dashboard__" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground"}
						${isCollapsed ? "justify-center" : ""}`}
				>
					<LayoutDashboard className="w-4 h-4 flex-shrink-0" />
					{!isCollapsed && (
						<span className="truncate flex-1 text-left">Overview</span>
					)}
				</button>

				<div className="h-px bg-border/40 my-1 mx-1" />

				{/* Category rows */}
				{categories.map((cat) => {
					const count = habits.filter((h) => h.category === cat).length;
					const isActive = activeCategory === cat;
					const Icon = getCategoryIcon(cat);
					return (
						<button
							key={cat}
							onClick={() => {
								onSelect(cat);
								onMobileClose();
							}}
							title={cat}
							className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors group relative
								${isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground"}
								${isCollapsed ? "justify-center" : ""}`}
						>
							<Icon className="w-4 h-4 flex-shrink-0" />
							{!isCollapsed && (
								<>
									<span className="truncate flex-1 text-left text-sm">
										{cat}
									</span>
									<span
										className={`text-[10px] tabular-nums ml-auto flex-shrink-0 ${
											isActive ? "opacity-70" : "opacity-40"
										}`}
									>
										{count}
									</span>
								</>
							)}
							{isCollapsed && (
								<span className="absolute -top-1 -right-1 text-[9px] bg-muted text-muted-foreground rounded-full w-4 h-4 flex items-center justify-center leading-none">
									{count}
								</span>
							)}
						</button>
					);
				})}

				<div className="h-px bg-border/40 my-1 mx-1" />

				{/* Add habit */}
				<button
					onClick={onAddHabit}
					title="Add Habit"
					className={`mt-2 flex items-center px-2 py-3 justify-center gap-1 rounded-lg text-xs font-medium bg-[#8b9a6b]/10 hover:bg-[#8b9a6b]/20 text-[#8b9a6b] transition-colors
						${isCollapsed ? "w-8 h-8" : "w-full"}`}
				>
					<Plus className="w-3.5 h-3.5 flex-shrink-0" />
					{!isCollapsed && <span>Add Habit</span>}
				</button>
			</>
		);
	};

	return (
		<>
			{/* Desktop sidebar */}
			<div className="hidden sm:flex h-full flex-shrink-0 sticky top-0">
				<div
					className={`flex flex-col h-full bg-card border-r border-border/50 transition-all duration-200 ${
						collapsed ? "w-14" : "w-fit"
					}`}
				>
					{/* Search */}
					<div
						className={`flex-shrink-0 border-b border-border/50 ${
							collapsed ? "flex justify-center px-2 py-2" : "px-2 py-2"
						}`}
					>
						{collapsed ? (
							<button
								onClick={onToggleCollapse}
								title="Expand to search"
								className="p-2 rounded-lg hover:bg-accent text-muted-foreground/50 hover:text-foreground transition-colors"
							>
								<Search className="w-4 h-4" />
							</button>
						) : (
							<div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-2.5 py-1.5">
								<Search className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
								<input
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search..."
									className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/30 min-w-0 w-32"
								/>
								{search && (
									<button
										onClick={() => setSearch("")}
										className="text-muted-foreground/40 hover:text-foreground transition-colors flex-shrink-0"
									>
										<X className="w-3 h-3" />
									</button>
								)}
								<button
									onClick={onToggleCollapse}
									className="p-1 rounded-md hover:bg-accent text-muted-foreground/60 hover:text-foreground transition-colors"
								>
									<ChevronRight
										className={`w-4 h-4 transition-transform duration-200 ${
											collapsed ? "" : "rotate-180"
										}`}
									/>
								</button>
							</div>
						)}
					</div>

					{/* Nav */}
					<div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2 min-h-0">
						<NavItems />
					</div>
				</div>
			</div>

			{/* Mobile drawer */}
			{mobileOpen && (
				<>
					<div
						className="fixed inset-0 z-40 bg-black/40 sm:hidden"
						onClick={onMobileClose}
					/>
					<div className="fixed inset-y-0 left-0 z-50 sm:hidden">
						<div className="flex flex-col h-full w-64 bg-card border-r border-border/50">
							<div className="flex items-center justify-between px-3 py-3 border-b border-border/50 flex-shrink-0">
								<span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
									Habits
								</span>
								<button
									onClick={onMobileClose}
									className="p-1 rounded-md hover:bg-accent text-muted-foreground/60"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
							<div className="flex-shrink-0 px-2 py-2 border-b border-border/50">
								<div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-2.5 py-1.5">
									<Search className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
									<input
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										placeholder="Search..."
										className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/30"
									/>
									{search && (
										<button
											onClick={() => setSearch("")}
											className="text-muted-foreground/40 hover:text-foreground"
										>
											<X className="w-3 h-3" />
										</button>
									)}
								</div>
							</div>
							<div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
								<NavItems forcedExpanded />
							</div>
						</div>
					</div>
				</>
			)}
		</>
	);
}

// ─── Main HabitView ──────────────────────────────────────────────────────────

export function HabitView() {
	const {
		habits,
		isLoading,
		handleUpdate,
		handleAdd,
		handleDelete,
		handleToggleToday,
	} = useHabits();

	const [activeCategory, setActiveCategory] = useState("__dashboard__");
	const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

	useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(search), 300);
		return () => clearTimeout(t);
	}, [search]);

	const selectedHabit = useMemo(
		() => habits.find((h) => h.id === selectedHabitId) ?? null,
		[habits, selectedHabitId],
	);

	// Categories sorted by CATEGORY_ORDER
	const categories = useMemo(() => {
		const existing = Array.from(new Set(habits.map((h) => h.category)));
		return existing.sort((a, b) => {
			const indexA = CATEGORY_ORDER.indexOf(a.toLowerCase());
			const indexB = CATEGORY_ORDER.indexOf(b.toLowerCase());
			if (indexA === -1 && indexB === -1) return a.localeCompare(b);
			if (indexA === -1) return 1;
			if (indexB === -1) return -1;
			return indexA - indexB;
		});
	}, [habits]);

	const categoryHabits = useMemo(() => {
		if (activeCategory === "__dashboard__") return [];
		return habits.filter((h) => h.category === activeCategory);
	}, [habits, activeCategory]);

	if (isLoading) {
		return (
			<div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
				Loading habits...
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Hamburger — mobile only */}
			<button
				onClick={() => setMobileSidebarOpen(true)}
				className="fixed bottom-5 right-5 sm:hidden p-3 bg-foreground text-background rounded-full shadow-lg hover:bg-foreground/90 transition-all z-50"
				aria-label="Menu"
			>
				<Menu className="w-5 h-5" />
			</button>

			<div className="flex flex-1 min-h-0 overflow-hidden">
				<HabitSidebar
					categories={categories}
					habits={habits}
					activeCategory={activeCategory}
					onSelect={setActiveCategory}
					onAddHabit={() => setShowAddModal(true)}
					collapsed={sidebarCollapsed}
					onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
					mobileOpen={mobileSidebarOpen}
					onMobileClose={() => setMobileSidebarOpen(false)}
					search={search}
					setSearch={setSearch}
				/>

				{/* Main content */}
				<div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
					<div className="flex-1 min-h-0 overflow-y-auto">
						{activeCategory === "__dashboard__" ? (
							<DashboardView
								habits={habits}
								search={debouncedSearch}
								onHabitClick={(h) => setSelectedHabitId(h.id)}
								onToggleToday={handleToggleToday}
							/>
						) : (
							<CategoryView
								category={activeCategory}
								habits={categoryHabits}
								search={debouncedSearch}
								onHabitClick={(h) => setSelectedHabitId(h.id)}
								onToggleToday={handleToggleToday}
							/>
						)}
					</div>
				</div>
			</div>

			{selectedHabit && (
				<HabitModal
					habit={selectedHabit}
					onClose={() => setSelectedHabitId(null)}
					onUpdate={handleUpdate}
					onDelete={async (id) => {
						setSelectedHabitId(null);
						await handleDelete(id);
					}}
					onToggleToday={() => handleToggleToday(selectedHabit.id)}
				/>
			)}

			{showAddModal && (
				<AddHabitModal
					onClose={() => setShowAddModal(false)}
					onAdd={handleAdd}
					categories={categories}
				/>
			)}
		</div>
	);
}
