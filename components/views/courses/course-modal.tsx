"use client";

import { useState, useRef, useEffect } from "react";
import type { Course, CourseStatus } from "@/lib/db/courses";
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
	GraduationCap,
	User,
	Link as LinkIcon,
	Clock,
	Award,
} from "lucide-react";

export function CourseModal({
	course,
	onClose,
	onUpdate,
	onDelete,
	onStatusChange,
}: {
	course: Course;
	onClose: () => void;
	onUpdate: (id: string, updates: Partial<Course>) => Promise<void>;
	onDelete: (id: string) => Promise<void>;
	onStatusChange: (id: string, status: CourseStatus) => Promise<void>;
}) {
	const [title, setTitle] = useState(course.title);
	const [notes, setNotes] = useState(course.notes ?? "");
	const [description, setDescription] = useState(course.description ?? "");
	const [progress, setProgress] = useState(course.progress?.toString() ?? "");
	const [platform, setPlatform] = useState(course.platform ?? "");
	const [instructor, setInstructor] = useState(course.instructor ?? "");
	const [url, setUrl] = useState(course.url ?? "");
	const [duration, setDuration] = useState(course.duration?.toString() ?? "");
	const [certificateUrl, setCertificateUrl] = useState(
		course.certificate_url ?? "",
	);
	const [completionDate, setCompletionDate] = useState(
		course.completion_date
			? new Date(course.completion_date).toISOString().split("T")[0]
			: "",
	);
	const [isSaving, setIsSaving] = useState(false);
	const [localStatus, setLocalStatus] = useState<CourseStatus>(course.status);
	const [hasChanges, setHasChanges] = useState(false);

	const descriptionRef = useRef<HTMLTextAreaElement>(null);
	const notesRef = useRef<HTMLTextAreaElement>(null);

	const priority = course.priority ? PRIORITY_CONFIG[course.priority] : null;

	// Track changes
	useEffect(() => {
		const changed =
			title !== course.title ||
			notes !== (course.notes ?? "") ||
			description !== (course.description ?? "") ||
			progress !== (course.progress?.toString() ?? "") ||
			platform !== (course.platform ?? "") ||
			instructor !== (course.instructor ?? "") ||
			url !== (course.url ?? "") ||
			duration !== (course.duration?.toString() ?? "") ||
			certificateUrl !== (course.certificate_url ?? "") ||
			completionDate !==
				(course.completion_date
					? new Date(course.completion_date).toISOString().split("T")[0]
					: "") ||
			localStatus !== course.status;
		setHasChanges(changed);
	}, [
		title,
		notes,
		description,
		progress,
		platform,
		instructor,
		url,
		duration,
		certificateUrl,
		completionDate,
		localStatus,
		course,
	]);

	// Auto-grow textareas
	useEffect(() => {
		[descriptionRef, notesRef].forEach((ref) => {
			if (ref.current) {
				ref.current.style.height = "auto";
				ref.current.style.height = `${ref.current.scrollHeight}px`;
			}
		});
	}, [description, notes]);

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await onUpdate(course.id, {
				title: title.trim() || course.title,
				description: description.trim() || null,
				notes: notes.trim() || null,
				progress: progress
					? Math.min(100, Math.max(0, parseInt(progress)))
					: null,
				platform: platform.trim() || null,
				instructor: instructor.trim() || null,
				url: url.trim() || null,
				duration: duration ? parseInt(duration) : null,
				certificate_url: certificateUrl.trim() || null,
				completion_date: completionDate
					? new Date(completionDate).toISOString()
					: null,
			});
			if (localStatus !== course.status) {
				await onStatusChange(course.id, localStatus);
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
									placeholder="Course title"
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
						<span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
							{course.category}
						</span>
					</div>

					{/* Status selector */}
					<div className="flex items-center gap-1.5 mt-3 flex-wrap">
						{(Object.keys(STATUS_CONFIG) as CourseStatus[]).map((s) => {
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
							placeholder="What is this course about..."
							className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring resize-none overflow-hidden min-h-[60px]"
						/>
					</div>

					{/* Platform + Instructor */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1.5">
								<GraduationCap className="w-3 h-3" />
								Platform
							</label>
							<input
								type="text"
								value={platform}
								onChange={(e) => setPlatform(e.target.value)}
								placeholder="Udemy, Coursera, etc."
								className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
						<div className="space-y-2">
							<label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1.5">
								<User className="w-3 h-3" />
								Instructor
							</label>
							<input
								type="text"
								value={instructor}
								onChange={(e) => setInstructor(e.target.value)}
								placeholder="Instructor name"
								className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
					</div>

					{/* URL */}
					<div className="space-y-2">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1.5">
							<LinkIcon className="w-3 h-3" />
							Course URL
						</label>
						<input
							type="url"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder="https://..."
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						/>
					</div>

					{/* Progress + Duration */}
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
								<Clock className="w-3 h-3" />
								Duration (hours)
							</label>
							<input
								type="number"
								min="0"
								value={duration}
								onChange={(e) => setDuration(e.target.value)}
								placeholder="Estimated hours"
								className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
					</div>

					{/* Completion Date + Certificate URL */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1.5">
								<CalendarDays className="w-3 h-3" />
								Completion Date
							</label>
							<input
								type="date"
								value={completionDate}
								onChange={(e) => setCompletionDate(e.target.value)}
								className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
						<div className="space-y-2">
							<label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1.5">
								<Award className="w-3 h-3" />
								Certificate URL
							</label>
							<input
								type="url"
								value={certificateUrl}
								onChange={(e) => setCertificateUrl(e.target.value)}
								placeholder="https://..."
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
							placeholder="Key takeaways, thoughts, blockers..."
							className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring resize-none overflow-hidden min-h-[60px]"
						/>
					</div>
				</div>

				{/* Footer Actions */}
				<div className="px-6 py-4 border-t border-border/60 flex items-center justify-between flex-shrink-0">
					<button
						type="button"
						onClick={async () => {
							if (confirm("Are you sure you want to delete this course?")) {
								onClose();
								await onDelete(course.id);
							}
						}}
						className="text-xs text-muted-foreground/50 hover:text-destructive transition-colors"
					>
						Delete course
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
