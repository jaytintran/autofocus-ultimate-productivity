"use client";

import { CheckCheck } from "lucide-react";
import { formatTimeCompact } from "@/lib/utils/time-utils";

interface NoteEntry {
	id: string;
	elapsedMs: number;
	text: string;
	type: "log" | "achievement" | "sidequest";
}

interface NoteEntryListProps {
	entries: NoteEntry[];
	editingNoteId: string | null;
	editingNoteText: string;
	onEditStart: (id: string, text: string) => void;
	onEditChange: (text: string) => void;
	onEditSave: (id: string, text: string) => void;
	onEditCancel: () => void;
	onDelete: (id: string) => void;
}

export function NoteEntryList({
	entries,
	editingNoteId,
	editingNoteText,
	onEditStart,
	onEditChange,
	onEditSave,
	onEditCancel,
	onDelete,
}: NoteEntryListProps) {
	// Sort: achievements first, then sidequests, then logs
	const sortedEntries = [
		...entries.filter((e) => e.type === "achievement"),
		...entries.filter((e) => e.type === "sidequest"),
		...entries.filter((e) => e.type === "log"),
	];

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, entryId: string) => {
		if (e.key === "Enter") {
			const trimmed = editingNoteText.trim();
			if (trimmed) {
				onEditSave(entryId, trimmed);
			} else {
				onDelete(entryId);
			}
		}
		if (e.key === "Escape") {
			onEditCancel();
		}
	};

	const handleBlur = (entryId: string) => {
		const trimmed = editingNoteText.trim();
		if (trimmed) {
			onEditSave(entryId, trimmed);
		} else {
			onDelete(entryId);
		}
	};

	return (
		<>
			{sortedEntries.map((entry) => {
				const isAchievement = entry.type === "achievement";
				const isSidequest = entry.type === "sidequest";

				return (
					<div
						key={entry.id}
						className="flex items-baseline gap-2 text-xs"
					>
						{/* Bullet / icon */}
						{isAchievement ? (
							<span className="text-amber-500 flex-shrink-0 text-[11px]">
								🏆
							</span>
						) : isSidequest ? (
							<CheckCheck className="w-3 h-3 text-sky-500 flex-shrink-0" />
						) : (
							<span className="text-[#8b9a6b] font-mono flex-shrink-0">
								•
							</span>
						)}

						{/* Timestamp — only for logs */}
						{!isAchievement && !isSidequest && (
							<span className="font-mono text-[10px] flex-shrink-0 text-muted-foreground/50">
								{formatTimeCompact(entry.elapsedMs)}
							</span>
						)}

						{/* Inline edit */}
						{editingNoteId === entry.id ? (
							<input
								autoFocus
								value={editingNoteText}
								onChange={(e) => onEditChange(e.target.value)}
								onKeyDown={(e) => handleKeyDown(e, entry.id)}
								onBlur={() => handleBlur(entry.id)}
								className={`flex-1 bg-transparent border-none outline-none text-xs focus:text-foreground transition-colors ${
									isAchievement
										? "text-amber-400"
										: isSidequest
											? "text-sky-400"
											: "text-foreground"
								}`}
							/>
						) : (
							<span
								onClick={() => onEditStart(entry.id, entry.text)}
								className={`cursor-pointer hover:text-foreground transition-colors ${
									isAchievement
										? "text-amber-500 dark:text-amber-400"
										: isSidequest
											? "text-sky-500 dark:text-sky-400"
											: "text-foreground/70"
								}`}
							>
								{entry.text}
							</span>
						)}
					</div>
				);
			})}
		</>
	);
}
