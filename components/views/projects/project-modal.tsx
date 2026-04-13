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
import { STATUS_CONFIG, PRIORITY_CONFIG } from "./constants";

export function ProjectModal({
	project,
	onClose,
	onUpdate,
	onDelete,
	onStatusChange,
}: {
	project: Project;
	onClose: () => void;
	onUpdate: (id: string, updates: Partial<Project>) => Promise<void>;
	onDelete: (id: string) => Promise<void>;
	onStatusChange: (id: string, status: ProjectStatus) => Promise<void>;
}) {
	const [title, setTitle] = useState(project.title);
	const [notes, setNotes] = useState(project.notes ?? "");
	const [outcomes, setOutcomes] = useState(project.key_outcomes ?? "");
	const [description, setDescription] = useState(project.description ?? "");
	const [progress, setProgress] = useState(project.progress?.toString() ?? "");
	const [dueDate, setDueDate] = useState(
		project.due_date
			? new Date(project.due_date).toISOString().split("T")[0]
			: "",
	);
	const [isSaving, setIsSaving] = useState(false);
	const [localStatus, setLocalStatus] = useState<ProjectStatus>(project.status);

	const priority = project.priority ? PRIORITY_CONFIG[project.priority] : null;

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await onUpdate(project.id, {
				title: title.trim() || project.title,
				description: description.trim() || null,
				notes: notes.trim() || null,
				key_outcomes: outcomes.trim() || null,
				progress: progress
					? Math.min(100, Math.max(0, parseInt(progress)))
					: null,
				due_date: dueDate ? new Date(dueDate).toISOString() : null,
			});
			if (localStatus !== project.status) {
				await onStatusChange(project.id, localStatus);
			}
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
						<DialogTitle>
							<input
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								className="text-base font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-ring focus:outline-none transition-colors w-full pr-6"
							/>
						</DialogTitle>
					</DialogHeader>

					{/* Meta pills */}
					<div className="flex items-center gap-2 mt-3 flex-wrap">
						{priority && (
							<span
								className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${priority.color} ${priority.bg}`}
							>
								{priority.label}
							</span>
						)}
						<span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
							{project.category}
						</span>
					</div>

					{/* Status selector */}
					<div className="flex items-center gap-1.5 mt-3 flex-wrap">
						{(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map((s) => {
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
					{/* Description */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Description
						</label>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="What is this project about..."
							rows={2}
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
						/>
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
								className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
							/>
							{progress && (
								<div className="h-1.5 bg-secondary rounded-full overflow-hidden">
									<div
										className="h-full bg-[#8b9a6b] rounded-full transition-all"
										style={{
											width: `${Math.min(100, parseInt(progress) || 0)}%`,
										}}
									/>
								</div>
							)}
						</div>
						<div className="space-y-1.5">
							<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
								Due Date
							</label>
							<input
								type="date"
								value={dueDate}
								onChange={(e) => setDueDate(e.target.value)}
								className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
							/>
						</div>
					</div>

					{/* Notes */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Notes
						</label>
						<textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Raw thoughts, blockers, context..."
							rows={4}
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
						/>
					</div>

					{/* Key Outcomes */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Key Outcomes
						</label>
						<textarea
							value={outcomes}
							onChange={(e) => setOutcomes(e.target.value)}
							placeholder="What does done look like, one per line..."
							rows={4}
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
						/>
					</div>

					{/* Actions */}
					<div className="flex items-center justify-between pt-1">
						<button
							type="button"
							onClick={async () => {
								onClose();
								await onDelete(project.id);
							}}
							className="text-xs text-muted-foreground/50 hover:text-destructive transition-colors"
						>
							Delete project
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
