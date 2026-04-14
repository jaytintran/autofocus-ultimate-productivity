import React, { useState, useCallback, memo } from "react";
import {
	Trash,
	RefreshCcw,
	CheckCircle2,
	FileText,
	Clock,
	Calendar,
	Circle,
} from "lucide-react";
import type { EntryModalProps } from "./types";
import type { TagId } from "@/lib/tags";
import { TagPill } from "@/components/shared/tag-pill";
import { formatCompletionTime } from "./utils";
import { formatTimeCompact } from "@/lib/utils/time-utils";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const EntryModal = memo(function EntryModal({
	task,
	onSave,
	onDelete,
	onRevert,
	onClose,
}: EntryModalProps) {
	const isLog = task.source === "log";
	const [title, setTitle] = useState(task.text);
	const [note, setNote] = useState(task.note ?? "");
	const [tag, setTag] = useState<TagId | null>(task.tag ?? null);
	const [isSaving, setIsSaving] = useState(false);

	// Editable metadata
	const [completedAt, setCompletedAt] = useState(
		task.completed_at ? formatCompletionTime(task.completed_at) : "",
	);
	const [timeInput, setTimeInput] = useState(
		task.total_time_ms > 0 ? formatTimeCompact(task.total_time_ms) : "0m 0s",
	);

	// Parse time input like "1h 30m" or "45m 20s" to milliseconds
	const parseTimeToMs = (input: string): number => {
		const hourMatch = input.match(/(\d+)h/);
		const minMatch = input.match(/(\d+)m/);
		const secMatch = input.match(/(\d+)s/);

		const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
		const minutes = minMatch ? parseInt(minMatch[1], 10) : 0;
		const seconds = secMatch ? parseInt(secMatch[1], 10) : 0;

		return (hours * 3600 + minutes * 60 + seconds) * 1000;
	};

	const handleSave = useCallback(async () => {
		if (isSaving || !title.trim()) return;
		setIsSaving(true);
		try {
			// Parse the time input to milliseconds
			const totalTimeMs = isLog ? 0 : parseTimeToMs(timeInput);

			// Convert time input (HH:MM) to ISO string
			let completedAtISO: string | null = null;
			if (completedAt && task.completed_at) {
				const originalDate = new Date(task.completed_at);
				const [hours, minutes] = completedAt.split(':').map(Number);
				originalDate.setHours(hours, minutes, 0, 0);
				completedAtISO = originalDate.toISOString();
			}

			await onSave(task.id, title.trim(), note.trim(), tag, completedAtISO, totalTimeMs);
			onClose();
		} finally {
			setIsSaving(false);
		}
	}, [task.id, title, note, tag, completedAt, timeInput, isLog, task.completed_at, isSaving, onSave, onClose]);

	const handleDelete = useCallback(async () => {
		onClose();
		await onDelete(task.id);
	}, [task.id, onDelete, onClose]);

	const handleRevert = useCallback(async () => {
		if (!onRevert) return;
		onClose();
		await onRevert(task.id);
	}, [task.id, onRevert, onClose]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				handleSave();
			}
		},
		[handleSave],
	);

	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[460px] max-w-[calc(100vw-2rem)] overflow-hidden p-0">
				<div className="px-6 pt-5">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							{isLog ? (
								<Circle className="w-4 h-4 text-muted-foreground/50" />
							) : (
								<CheckCircle2 className="w-4 h-4 text-[#8b9a6b]" />
							)}
							<span>{isLog ? "Log Entry" : "Completed Task"}</span>
						</DialogTitle>
					</DialogHeader>

					<div className="mt-4 space-y-2 flex gap-2 items-center">
						<div className="flex items-center gap-2">
							<input
								type="time"
								value={completedAt}
								onChange={(e) => setCompletedAt(e.target.value)}
								className="text-[11px] font-mono text-muted-foreground/80 bg-secondary px-2 py-1 rounded-md border border-border/40 focus:outline-none focus:ring-1 focus:ring-ring"
								disabled={isSaving}
							/>
						</div>

						{!isLog && (
							<div className="flex items-center gap-2">
								<input
									type="text"
									value={timeInput}
									onChange={(e) => setTimeInput(e.target.value)}
									placeholder="0m 0s"
									className="text-[11px] text-[#8b9a6b] bg-[#8b9a6b]/10 px-2 py-1 rounded-md border border-[#8b9a6b]/20 focus:outline-none focus:ring-1 focus:ring-[#8b9a6b]/40 w-15"
									disabled={isSaving}
								/>
							</div>
						)}

						<TagPill
							tagId={tag}
							onSelectTag={setTag}
							disabled={isSaving}
							className="-mt-2 py-1 rounded-none"
						/>
					</div>
				</div>

				<div className="px-6 pb-6 space-y-4 border-t border-border/60 pt-4 bg-secondary/20">
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							{isLog ? "Activity" : "Task"}
						</label>
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							onKeyDown={handleKeyDown}
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
							disabled={isSaving}
							autoFocus
						/>
					</div>

					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							{isLog ? "Note" : "Achievement Note"}
						</label>
						<textarea
							value={note}
							onChange={(e) => setNote(e.target.value)}
							placeholder={isLog ? "Add a note..." : "What did you accomplish?"}
							rows={3}
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring resize-none transition-colors"
							disabled={isSaving}
						/>
					</div>

					<div className="flex items-center justify-between pt-1">
						<div className="flex gap-2">
							<Button
								variant="ghost"
								onClick={handleDelete}
								disabled={isSaving}
								className="text-xs text-muted-foreground/50 hover:text-destructive transition-colors disabled:opacity-50"
							>
								<Trash className="w-3.5! h-3.5!" />
							</Button>
							{!isLog && onRevert && (
								<Button
									variant="ghost"
									onClick={handleRevert}
									disabled={isSaving}
									className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors disabled:opacity-50"
								>
									<RefreshCcw className="w-3.5! h-3.5!" />
								</Button>
							)}
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={onClose}
								disabled={isSaving}
							>
								Cancel
							</Button>
							<Button
								size="sm"
								onClick={handleSave}
								disabled={isSaving || !title.trim()}
							>
								{isSaving ? "Saving..." : "Save"}
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
});
