"use client";

import { useState } from "react";
import type { Project, ProjectStatus } from "@/lib/db/projects";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "./constants";

export function AddProjectModal({
	onClose,
	onAdd,
	categories,
}: {
	onClose: () => void;
	onAdd: (
		project: Omit<Project, "id" | "created_at" | "updated_at">,
	) => Promise<void>;
	categories: string[];
}) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [priority, setPriority] = useState<Project["priority"]>("MEDIUM");
	const [status, setStatus] = useState<ProjectStatus>("planning");
	const [progress, setProgress] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [saving, setSaving] = useState(false);

	const handleSubmit = async () => {
		if (!title.trim() || selectedCategories.length === 0) return;
		setSaving(true);
		try {
			await onAdd({
				title: title.trim(),
				description: description.trim() || null,
				category: selectedCategories,
				priority,
				status,
				progress: progress ? parseInt(progress) : null,
				due_date: dueDate ? new Date(dueDate).toISOString() : null,
				notes: null,
				key_outcomes: null,
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
						<DialogTitle>Add Project</DialogTitle>
					</DialogHeader>
				</div>

				<div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 border-t border-border/60 pt-4 bg-secondary/20">
					{/* Title */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Title *
						</label>
						<input
							autoFocus
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Project title"
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
							Categories *
						</label>
						<MultiSelect
							value={selectedCategories}
							onChange={setSelectedCategories}
							options={categories}
							placeholder="Select categories..."
							allowCustom={true}
						/>
					</div>

					{/* Priority */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Priority
						</label>
						<div className="flex flex-wrap gap-1.5">
							{(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((p) => {
								const cfg = PRIORITY_CONFIG[p];
								return (
									<button
										key={p}
										type="button"
										onClick={() => setPriority(p)}
										className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
											priority === p
												? `border-foreground/30 bg-foreground/10 ${cfg.color}`
												: "border-border text-muted-foreground hover:border-foreground/20"
										}`}
									>
										{p}
									</button>
								);
							})}
						</div>
					</div>

					{/* Status */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Status
						</label>
						<div className="flex flex-wrap gap-1.5">
							{(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map((s) => {
								const cfg = STATUS_CONFIG[s];
								return (
									<button
										key={s}
										type="button"
										onClick={() => setStatus(s)}
										className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
											status === s
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

					{/* Progress + Due Date */}
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
								Progress (%)
							</label>
							<input
								type="number"
								min="0"
								max="100"
								value={progress}
								onChange={(e) => setProgress(e.target.value)}
								placeholder="0–100"
								className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
								Due Date
							</label>
							<input
								type="date"
								value={dueDate}
								onChange={(e) => setDueDate(e.target.value)}
								className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
							/>
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
							disabled={saving || !title.trim() || selectedCategories.length === 0}
						>
							{saving ? "Adding..." : "Add Project"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
