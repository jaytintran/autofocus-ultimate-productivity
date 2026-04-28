import React, { useState, useCallback, memo } from "react";
import { Check, X, Circle, ChevronDown, ChevronRight, CheckCheck } from "lucide-react";
import type { TaskItemProps } from "./types";
import type { TagId } from "@/lib/tags";
import { TagPill } from "@/components/shared/tag-pill";
import { formatCompletionTime } from "./utils";
import { formatTimeCompact } from "@/lib/utils/time-utils";

export const BulletIndicator = memo(function BulletIndicator({
	isLog,
	hasNote,
	onClick,
}: {
	isLog: boolean;
	hasNote: boolean;
	onClick?: () => void;
}) {
	if (isLog) {
		return (
			<span className="text-muted-foreground/50 flex-shrink-0 leading-none mt-0.5">
				<Circle className="w-3.5 h-3.5" />
			</span>
		);
	}

	if (hasNote) {
		return (
			<button
				type="button"
				onClick={onClick}
				className="flex-shrink-0 text-amber-500 hover:text-amber-400 transition-colors leading-none mt-0.5"
			>
				<X className="w-3.5 h-3.5" />
			</button>
		);
	}

	return (
		<span className="text-[#8b9a6b] flex-shrink-0 leading-none mt-0.5">
			<Check className="w-3.5 h-3.5" />
		</span>
	);
});

export const TaskMetadata = memo(function TaskMetadata({
	completedAt,
	totalTimeMs,
	tag,
	loadingTagTaskId,
	isLoading,
	onUpdateTag,
}: {
	completedAt: string | null;
	totalTimeMs: number;
	tag: TagId | null;
	loadingTagTaskId: string | null;
	isLoading: boolean;
	onUpdateTag: (tag: TagId | null) => void;
}) {
	return (
		<div className="flex items-center justify-between gap-2 mt-0.5">
			<div className="flex items-center gap-2 flex-wrap">
				{completedAt && (
					<span className="text-[11px] text-muted-foreground/60 font-mono">
						{formatCompletionTime(completedAt)}
					</span>
				)}
				{totalTimeMs > 0 && (
					<span className="text-[11px] text-[#8b9a6b]">
						{formatTimeCompact(totalTimeMs)}
					</span>
				)}
			</div>
			<TagPill
				tagId={tag}
				onSelectTag={onUpdateTag}
				disabled={loadingTagTaskId !== null || isLoading}
				className="scale-90 origin-right"
			/>
		</div>
	);
});

export const TaskAchievementNote = memo(function TaskNote({
	note,
	isLog,
	onClick,
}: {
	note: string;
	isLog: boolean;
	onClick: () => void;
}) {
	return (
		<p
			onClick={onClick}
			className={`text-[12px] mt-0.5 cursor-pointer transition-colors ${
				isLog
					? "text-muted-foreground/60 hover:text-muted-foreground"
					: "text-amber-700 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300"
			}`}
		>
			{isLog ? note : `🏆 ${note}`}
		</p>
	);
});

function parseNoteLines(note: string): {
	achievements: string[];
	sidequests: string[];
	logs: string[];
} {
	const lines = note.split("\n").filter((l) => l.trim());
	const achievements = lines.filter((l) => !l.startsWith("•") && !l.startsWith("✓"));
	const sidequests = lines.filter((l) => l.startsWith("✓"));
	const logs = lines.filter((l) => l.startsWith("•"));
	return { achievements, sidequests, logs };
}

export const TaskSessionLogNote = memo(function TaskSessionLogNote({
	note,
}: {
	note: string;
}) {
	const [expanded, setExpanded] = useState(false);
	const { achievements, sidequests, logs } = parseNoteLines(note);

	return (
		<div className="mt-0.5">
			{/* Achievement section — always visible */}
			{achievements.length > 0 && (
				<div className="mt-1 space-y-0.5">
					{achievements.map((line, i) => (
						<p
							key={i}
							className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug"
						>
							🏆 {line}
						</p>
					))}
				</div>
			)}

			{/* Sidequest section — always visible */}
			{sidequests.length > 0 && (
				<div className="mt-1 space-y-0.5">
					{sidequests.map((line, i) => (
						<p
							key={i}
							className="text-[11px] text-sky-600 dark:text-sky-400 leading-snug flex items-start gap-1"
						>
							<CheckCheck className="w-3 h-3 shrink-0 mt-0.5" />
							<span>{line.replace(/^✓\s*/, '')}</span>
						</p>
					))}
				</div>
			)}

			{/* Log section */}
			{logs.length > 0 && (
				<div className="mt-0.5">
					<button
						type="button"
						onClick={() => setExpanded((v) => !v)}
						className="flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors border-t mt-3 border-border w-1/5"
					>
						<span className="pr-2 py-2">
							{expanded ? (
								<ChevronDown className="w-3 h-3" />
							) : (
								<ChevronRight className="w-3 h-3" />
							)}
						</span>
						<span className="text-[10px]">Session Log</span>
					</button>
					{expanded && (
						<div className="mt-1 space-y-0.5 pl-1">
							{logs.map((line, i) => (
								<p
									key={i}
									className="text-[11px] text-muted-foreground/70 leading-snug"
								>
									{line}
								</p>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
});

export const BulletRow = memo(function BulletRow({
	task,
	isLoading,
	loadingTagTaskId,
	showDeleteConfirm,
	onSelect,
	onRevert,
	onDelete,
	onUpdateTag,
}: TaskItemProps) {
	const isLog = task.source === "log";

	// Note types:
	// session log — multi-line, logged in real-time during a work session, timestamped, granular
	// achievement — single-line, written at completion, one reflection/summary of what was done
	const isMultiLineNote =
		!!task.note && (task.note.includes("\n") || task.note.startsWith("•") || task.note.startsWith("✓"));

	const handleSelect = useCallback(() => {
		onSelect(task.id);
	}, [onSelect, task.id]);

	const handleRevert = useCallback(() => {
		onRevert(task);
	}, [onRevert, task]);

	const handleDelete = useCallback(() => {
		onDelete(task.id);
	}, [onDelete, task.id]);

	const handleUpdateTag = useCallback(
		(tag: TagId | null) => {
			onUpdateTag(task.id, tag);
		},
		[onUpdateTag, task.id],
	);

	return (
		<li className={`group py-1.5 ${isLoading ? "opacity-50" : ""}`}>
			<div className="flex items-start gap-2.5">
				<div className="relative z-10 bg-background px-0.5">
					<BulletIndicator
						isLog={isLog}
						hasNote={!!task.note}
						onClick={handleSelect}
					/>
				</div>

				<div className="flex-1 min-w-0">
					<TaskMetadata
						completedAt={task.completed_at}
						totalTimeMs={task.total_time_ms}
						tag={task.tag}
						loadingTagTaskId={loadingTagTaskId}
						isLoading={isLoading}
						onUpdateTag={handleUpdateTag}
					/>

					<span
						className={`text-sm leading-snug break-words cursor-pointer transition-colors block ${
							isLog
								? "text-foreground hover:text-foreground/80"
								: "text-muted-foreground line-through hover:text-foreground/70"
						}`}
						onClick={handleSelect}
					>
						{task.text}
					</span>

					{task.note &&
						(isMultiLineNote ? (
							<TaskSessionLogNote note={task.note} />
						) : (
							<TaskAchievementNote
								note={task.note}
								isLog={isLog}
								onClick={handleSelect}
							/>
						))}
				</div>
			</div>
		</li>
	);
});
