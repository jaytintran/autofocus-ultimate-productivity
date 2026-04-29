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
import { STATUS_CONFIG, PRIORITY_CONFIG } from "./constants";
import {
	CalendarDays,
	Target,
	FileText,
	Lightbulb,
} from "lucide-react";

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
	const [isEditing, setIsEditing] = useState(false);
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

	const descriptionRef = useRef<HTMLTextAreaElement>(null);
	const notesRef = useRef<HTMLTextAreaElement>(null);
	const outcomesRef = useRef<HTMLTextAreaElement>(null);

	const priority = project.priority ? PRIORITY_CONFIG[project.priority] : null;
	const statusConfig = STATUS_CONFIG[localStatus];

	// Auto-grow textareas
	useEffect(() => {
		if (!isEditing) return;
		[descriptionRef, notesRef, outcomesRef].forEach((ref) => {
			if (ref.current) {
				ref.current.style.height = "auto";
				ref.current.style.height = `${ref.current.scrollHeight}px`;
			}
		});
	}, [description, notes, outcomes, isEditing]);

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
			setIsEditing(false);
		} finally {
			setIsSaving(false);
		}
	};

	const formatDate = (dateStr: string | null) => {
		if (!dateStr) return "No due date";
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[580px] max-w-[calc(100vw-2rem)] p-0 overflow-hidden max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="px-6 pt-5 pb-4 flex-shrink-0 border-b border-border/60">
					<div className="flex items-start justify-between gap-4">
						<DialogHeader className="flex-1">
							<DialogTitle>
								{isEditing ? (
									<input
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										className="text-lg font-semibold bg-transparent border-b border-border hover:border-ring focus:border-ring focus:outline-none transition-colors w-full"
										placeholder="Project title"
									/>
								) : (
									<h2 className="text-lg font-semibold text-foreground">
										{project.title}
									</h2>
								)}
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
						<span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
							{project.category}
						</span>
						<span
							className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${statusConfig.bg} ${statusConfig.text}`}
						>
							<div className={`w-1 h-1 rounded-full ${statusConfig.dot}`} />
							{statusConfig.label}
						</span>
					</div>

					{/* Status selector - Edit mode only */}
					{isEditing && (
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
					)}
				</div>

				{/* Content */}
				<div className="overflow-y-auto px-6 pb-6 pt-5">
					{isEditing ? (
						/* EDIT MODE */
						<>
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
									className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring resize-none overflow-hidden"
								/>
							</div>

							{/* Progress + Due Date */}
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1.5">
										<Target className="w-3 h-3" />
										Progress (%)
									</label>
									{/* {progress && (
										<div className="h-2 bg-secondary rounded-full overflow-hidden">
											<div
												className="h-full bg-[#8b9a6b] rounded-full transition-all"
												style={{
													width: `${Math.min(100, parseInt(progress) || 0)}%`,
												}}
											/>
										</div>
									)} */}
									<input
										type="number"
										min="0"
										max="100"
										value={progress}
										onChange={(e) => setProgress(e.target.value)}
										placeholder="0–100"
										className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
									/>
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
							<div className="space-y-2 mt-2">
								<label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1.5">
									<Lightbulb className="w-3 h-3" />
									Notes
								</label>
								<textarea
									ref={notesRef}
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									placeholder="Raw thoughts, blockers, context..."
									className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring resize-none overflow-hidden"
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
									className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring resize-none overflow-hidden"
								/>
							</div>
						</>
					) : (
						/* VIEW MODE */
						<>
							<div className="flex flex-col gap-6">
								{/* Description */}
								{description && (
									<div className="">
										<h3 className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1.5 mb-2">
											<FileText className="w-3 h-3" />
											Description
										</h3>
										<p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
											{description}
										</p>
									</div>
								)}

								{/* Progress + Due Date */}
								{progress && (
									<div className="block">
										<h3 className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1.5 mb-2">
											<Target className="w-3 h-3" />
											Progress {progress}%
										</h3>
										<div className="h-2 bg-secondary rounded-full overflow-hidden">
											<div
												className="h-full bg-[#8b9a6b] rounded-full transition-all"
												style={{ width: `${parseInt(progress)}%` }}
											/>
										</div>
									</div>
								)}
								<div className="block">
									<h3 className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1.5 mb-2">
										<CalendarDays className="w-3 h-3" />
										Due Date
									</h3>
									<p className="text-sm text-foreground/90">
										{formatDate(project.due_date)}
									</p>
								</div>

								{/* Notes */}
								{notes && (
									<div className="space-y-2">
										<h3 className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1.5">
											<Lightbulb className="w-3 h-3" />
											Notes
										</h3>
										<p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap bg-secondary/30 rounded-lg p-3">
											{notes}
										</p>
									</div>
								)}

								{/* Key Outcomes */}
								{outcomes && (
									<div className="space-y-2">
										<h3 className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1.5">
											<Target className="w-3 h-3" />
											Key Outcomes
										</h3>
										<ul className="space-y-1.5">
											{outcomes
												.split("\n")
												.filter(Boolean)
												.map((outcome, i) => (
													<li
														key={i}
														className="text-sm text-foreground/90 flex items-start gap-2"
													>
														<span className="text-[#8b9a6b] mt-0.5">•</span>
														<span className="flex-1">{outcome}</span>
													</li>
												))}
										</ul>
									</div>
								)}

								{/* Empty state */}
								{!description && !notes && !outcomes && !progress && (
									<div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
										<FileText className="w-8 h-8 mb-2 opacity-20" />
										<p className="text-sm">No details added yet</p>
										<button
											onClick={() => setIsEditing(true)}
											className="text-xs text-[#8b9a6b] hover:underline mt-2"
										>
											Add details
										</button>
									</div>
								)}
							</div>
						</>
					)}
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
						className="text-xs text-muted-foreground/50 hover:text-destructive transition-colors"
					>
						Delete project
					</button>
					<div className="flex gap-2">
						{isEditing ? (
							<>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setIsEditing(false)}
								>
									View
								</Button>
								<Button size="sm" onClick={handleSave} disabled={isSaving}>
									{isSaving ? "Saving..." : "Save Changes"}
								</Button>
							</>
						) : (
							<>
								<Button variant="outline" size="sm" onClick={onClose}>
									Close
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setIsEditing(true)}
								>
									Edit
								</Button>
							</>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
