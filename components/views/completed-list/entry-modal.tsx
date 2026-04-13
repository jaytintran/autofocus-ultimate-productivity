import React, { useState, useCallback, memo } from "react";
import { Trash, RefreshCcw } from "lucide-react";
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

	const handleSave = useCallback(async () => {
		if (isSaving || !title.trim()) return;
		setIsSaving(true);
		try {
			await onSave(task.id, title.trim(), note.trim(), tag);
			onClose();
		} finally {
			setIsSaving(false);
		}
	}, [task.id, title, note, tag, isSaving, onSave, onClose]);

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
				<div className="px-6 pt-5 pb-4">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							{isLog ? (
								<span className="text-muted-foreground/50 font-mono text-base leading-none">
									•
								</span>
							) : (
								<span className="text-[#8b9a6b] font-mono text-sm leading-none">
									×
								</span>
							)}
							<span>{isLog ? "Log Entry" : "Completed Task"}</span>
						</DialogTitle>
					</DialogHeader>

					<div className="flex items-center gap-2 mt-3 flex-wrap">
						{task.completed_at && (
							<span className="text-[11px] font-mono text-muted-foreground/60 bg-secondary px-2 py-0.5 rounded-md">
								{formatCompletionTime(task.completed_at)}
							</span>
						)}
						{!isLog && task.total_time_ms > 0 && (
							<span className="text-[11px] text-[#8b9a6b] bg-[#8b9a6b]/10 px-2 py-0.5 rounded-md">
								{formatTimeCompact(task.total_time_ms)}
							</span>
						)}
						<TagPill tagId={tag} onSelectTag={setTag} disabled={isSaving} />
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
