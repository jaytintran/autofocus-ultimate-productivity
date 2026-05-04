"use client";

import { useState, useRef, useEffect } from "react";
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
import { CalendarDays, Target, FileText, Lightbulb } from "lucide-react";

export function ProjectModal({
	project,
	onClose,
	onUpdate,
	onDelete,
	onStatusChange,
	allCategories,
}: {
	project: Project;
	onClose: () => void;
	onUpdate: (id: string, updates: Partial<Project>) => Promise<void>;
	onDelete: (id: string) => Promise<void>;
	onStatusChange: (id: string, status: ProjectStatus) => Promise<void>;
	allCategories: string[];
}) {
	const [title, setTitle] = useState(project.title);
	const [categories, setCategories] = useState<string[]>(
		Array.isArray(project.category) ? project.category : [project.category]
	);
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
	const [hasChanges, setHasChanges] = useState(false);

	const descriptionRef = useRef<HTMLTextAreaElement>(null);
	const notesRef = useRef<HTMLTextAreaElement>(null);
	const outcomesRef = useRef<HTMLTextAreaElement>(null);

	const priority = project.priority ? PRIORITY_CONFIG[project.priority] : null;

	// Track changes
	useEffect(() => {
		const changed =
			title !== project.title ||
			notes !== (project.notes ?? "") ||
			outcomes !== (project.key_outcomes ?? "") ||
			description !== (project.description ?? "") ||
			progress !== (project.progress?.toString() ?? "") ||
			dueDate !==
				(project.due_date
					? new Date(project.due_date).toISOString().split("T")[0]
					: "") ||
			localStatus !== project.status ||
			JSON.stringify(categories) !== JSON.stringify(project.category);
		setHasChanges(changed);
	}, [
		title,
		notes,
		outcomes,
		description,
		progress,
		dueDate,
		localStatus,
		categories,
		project,
	]);

	// Auto-grow textareas
	useEffect(() => {
		[descriptionRef, notesRef, outcomesRef].forEach((ref) => {
			if (ref.current) {
				ref.current.style.height = "auto";
				ref.current.style.height = `${ref.current.scrollHeight}px`;
			}
		});
	}, [description, notes, outcomes]);

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await onUpdate(project.id, {
				title: title.trim() || project.title,
				category: categories,
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
			setHasChanges(false);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[580px] max-w-[calc(100vw-2rem)] p-0 overflow-hidden max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="px-6 pt-5 pb-4 flex-shrink-0 border-b border-border/60">
					<div className="flex items-start justify-between gap-4">
						<DialogHeader className="flex-1">
							<DialogTitle>
								<input
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-ring focus:outline-none transition-colors w-full"
									placeholder="Project title"
								/>
							</DialogTitle>
						</DialogHeader>
					</div>

					{/* Meta pills */}
					<div className="flex items-center gap-2 mt-3 flex-wrap">
						{priority && (
							<span
								className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${priority.color} ${priority.bg}`}
							>
								{priority.label}
							</span>
						)}
						{(Array.isArray(project.category) ? project.category : [project.category]).map((cat) => (
							<span key={cat} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
								{cat}
							</span>
						))}
					</div>

					{/* Categories Editor */}
					<div className="mt-3">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1.5 block">
							Categories
						</label>
						<MultiSelect
							value={categories}
							onChange={setCategories}
							options={allCategories}
							placeholder="Select categories..."
							allowCustom={true}
						/>
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

				{/* Content */}
				<div className="overflow-y-auto px-6 pb-6 pt-5 space-y-4">
					{/* Description */}
					<div className="space-y-2">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1.5">
							<FileText className="w-3 h-3" />
							Description
						</label>
						<textarea
							ref={descriptionRef}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="What is this project about..."
							className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring resize-none overflow-hidden min-h-[60px]"
						/>
					</div>

					{/* Progress + Due Date */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1.5">
								<Target className="w-3 h-3" />
								Progress (%)
							</label>
							<input
								type="number"
								min="0"
								max="100"
								value={progress}
								onChange={(e) => setProgress(e.target.value)}
								placeholder="0–100"
								className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							/>
							{progress && (
								<div className="h-2 bg-secondary rounded-full overflow-hidden">
									<div
										className="h-full bg-[#8b9a6b] rounded-full transition-all"
										style={{
											width: `${Math.min(100, parseInt(progress) || 0)}%`,
										}}
									/>
								</div>
							)}
						</div>
						<div className="space-y-2">
							<label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1.5">
								<CalendarDays className="w-3 h-3" />
								Due Date
							</label>
							<input
								type="date"
								value={dueDate}
								onChange={(e) => setDueDate(e.target.value)}
								className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
					</div>

					{/* Notes */}
					<div className="space-y-2">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1.5">
							<Lightbulb className="w-3 h-3" />
							Notes
						</label>
						<textarea
							ref={notesRef}
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Raw thoughts, blockers, context..."
							className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring resize-none overflow-hidden min-h-[60px]"
						/>
					</div>

					{/* Key Outcomes */}
					<div className="space-y-2">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1.5">
							<Target className="w-3 h-3" />
							Key Outcomes
						</label>
						<textarea
							ref={outcomesRef}
							value={outcomes}
							onChange={(e) => setOutcomes(e.target.value)}
							placeholder="What does done look like, one per line..."
							className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring resize-none overflow-hidden min-h-[60px]"
						/>
					</div>
				</div>

				{/* Footer Actions */}
				<div className="px-6 py-4 border-t border-border/60 flex items-center justify-between flex-shrink-0">
					<button
						type="button"
						onClick={async () => {
							if (confirm("Are you sure you want to delete this project?")) {
								onClose();
								await onDelete(project.id);
							}
						}}
						className="text-xs text-muted-foreground/50 hover:text-destructive transition-colors border border-destructive py-2 px-3"
					>
						Delete
					</button>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" onClick={onClose}>
							Close
						</Button>
						{hasChanges && (
							<Button size="sm" onClick={handleSave} disabled={isSaving}>
								{isSaving ? "Saving..." : "Save Changes"}
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
