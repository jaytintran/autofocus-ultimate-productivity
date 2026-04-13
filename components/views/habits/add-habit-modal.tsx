import { useState } from "react";
import type { Habit } from "@/lib/db/habits";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HABIT_COLORS } from "./constants";

interface AddHabitModalProps {
	onClose: () => void;
	onAdd: (
		habit: Omit<Habit, "id" | "created_at" | "updated_at" | "completions">,
	) => Promise<void>;
	categories: string[];
}

export function AddHabitModal({
	onClose,
	onAdd,
	categories,
}: AddHabitModalProps) {
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
				position: 0,
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
