import React, { useState, useMemo, useCallback, useRef, memo } from "react";
import { Send, Dot, X } from "lucide-react";
import type { LogActivityBarProps } from "./types";
import type { TagId } from "@/lib/tags";
import { TAG_DEFINITIONS, getTagDefinition } from "@/lib/tags";
import { parseAtTime, stripAtTime } from "./utils";

const LogTagMentionDropdown = memo(function LogTagMentionDropdown({
	query,
	onSelect,
}: {
	query: string;
	onSelect: (tagId: TagId) => void;
}) {
	const filtered = useMemo(
		() =>
			TAG_DEFINITIONS.filter((tag) => tag.id.startsWith(query.toLowerCase())),
		[query],
	);

	if (filtered.length === 0) return null;

	return (
		<div className="absolute bottom-full mb-2 left-0 bg-card border border-border rounded-xl shadow-lg p-1.5 z-50 min-w-[160px]">
			<p className="text-[10px] text-muted-foreground px-2 py-1">Tag as...</p>
			{filtered.map((tag) => (
				<button
					key={tag.id}
					type="button"
					onMouseDown={(e) => {
						e.preventDefault();
						onSelect(tag.id);
					}}
					className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-lg hover:bg-accent transition-colors text-left"
				>
					<span>{tag.emoji}</span>
					<span>{tag.label}</span>
				</button>
			))}
		</div>
	);
});

export const LogActivityBar = memo(function LogActivityBar({
	onAddLoggedActivity,
}: LogActivityBarProps) {
	const [logText, setLogText] = useState("");
	const [source, setSource] = useState<"log" | "task">("log");
	const [logTag, setLogTag] = useState<TagId | null>(null);
	const [logMentionQuery, setLogMentionQuery] = useState<string | null>(null);
	const [logParsedTime, setLogParsedTime] = useState<{
		isoString: string;
		display: string;
	} | null>(null);
	const [isSubmittingLog, setIsSubmittingLog] = useState(false);
	const logInputRef = useRef<HTMLInputElement>(null);

	const logTagDef = useMemo(
		() => (logTag ? getTagDefinition(logTag) : null),
		[logTag],
	);

	const handleTextChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value;
			setLogText(value);

			// Parse @time shortcut
			setLogParsedTime(parseAtTime(value));

			const mentionMatch = value.match(/#(\w*)$/);
			setLogMentionQuery(mentionMatch ? mentionMatch[1] : null);

			for (const tag of TAG_DEFINITIONS) {
				const regex = new RegExp(`#${tag.id}(\\s|$)`, "i");
				if (regex.test(value)) {
					setLogTag(tag.id);
					return;
				}
			}
			setLogTag(null);
		},
		[],
	);

	const handleSelectMention = useCallback((tagId: TagId) => {
		setLogText((t) => t.replace(/#\w*$/, "").trim());
		setLogTag(tagId);
		setLogMentionQuery(null);
		logInputRef.current?.focus();
	}, []);

	const handleRemoveTag = useCallback(() => {
		setLogTag(null);
	}, []);

	const handleRemoveTime = useCallback(() => {
		setLogParsedTime(null);
		setLogText((t) => stripAtTime(t));
	}, []);

	const handleSubmit = useCallback(async () => {
		const trimmed = logText.trim();
		if (!trimmed || isSubmittingLog) return;

		let cleanText = trimmed;
		cleanText = stripAtTime(cleanText);
		for (const tag of TAG_DEFINITIONS) {
			cleanText = cleanText
				.replace(new RegExp(`#${tag.id}(\\s|$)`, "gi"), "")
				.trim();
		}

		setIsSubmittingLog(true);
		try {
			await onAddLoggedActivity(
				cleanText || trimmed,
				logTag,
				null,
				logParsedTime?.isoString ?? null,
				source,
			);
			setLogText("");
			setLogTag(null);
			setLogParsedTime(null);
			setLogMentionQuery(null);
		} finally {
			setIsSubmittingLog(false);
			logInputRef.current?.focus();
		}
	}, [logText, logTag, logParsedTime, onAddLoggedActivity, isSubmittingLog, source]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				if (logMentionQuery !== null) {
					const filtered = TAG_DEFINITIONS.filter((tag) =>
						tag.id.startsWith(logMentionQuery.toLowerCase()),
					);
					if (filtered.length === 1) {
						handleSelectMention(filtered[0].id);
						return;
					}
				}
				handleSubmit();
			}
			if (e.key === "Escape") {
				setLogMentionQuery(null);
				setLogParsedTime(null);
			}
		},
		[handleSubmit, handleSelectMention, logMentionQuery],
	);

	return (
		<div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-10">
			<div className="bg-card border border-border rounded-full shadow-lg px-4 py-2.5 flex items-center gap-3 relative">
				{logMentionQuery !== null && (
					<div className="absolute bottom-full left-4 mb-2">
						<LogTagMentionDropdown
							query={logMentionQuery}
							onSelect={handleSelectMention}
						/>
					</div>
				)}

				<button
					type="button"
					onClick={() => setSource((s) => (s === "log" ? "task" : "log"))}
					className="flex-shrink-0 select-none leading-none relative p-1"
				>
					<span
						className={`relative flex items-center justify-center w-5 h-5 rounded-full border transition-colors ${
							source === "log"
								? "border-muted-foreground/30"
								: "border-[#8b9a6b]/60"
						}`}
					>
						{source === "log" ? (
							<span className="text-muted-foreground/50 font-mono text-base leading-none">
								<Dot className="w-5 h-5" />
							</span>
						) : (
							<span className="text-[#8b9a6b] font-mono text-sm leading-none">
								<X className="w-2.5 h-2.5" />
							</span>
						)}
					</span>
				</button>

				{logTagDef && (
					<button
						type="button"
						onClick={handleRemoveTag}
						className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[#8b9a6b]/10 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive transition-colors group"
						title="Remove tag"
					>
						<span>{logTagDef.emoji}</span>
						<span>{logTagDef.label}</span>
						<span className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
							×
						</span>
					</button>
				)}

				{logParsedTime && (
					<button
						type="button"
						onClick={handleRemoveTime}
						className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive transition-colors group"
						title="Remove time"
					>
						<span>🕐</span>
						<span>{logParsedTime.display}</span>
						<span className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
							×
						</span>
					</button>
				)}

				<input
					ref={logInputRef}
					type="text"
					value={logText}
					onChange={handleTextChange}
					onKeyDown={handleKeyDown}
					placeholder="Log an activity. Use # to tag, @time to set time..."
					className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm"
					disabled={isSubmittingLog}
				/>

				<button
					onClick={handleSubmit}
					disabled={!logText.trim() || isSubmittingLog}
					type="button"
					className="p-1.5 hover:bg-accent rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
				>
					<Send className="w-4 h-4 text-[#8b9a6b]" />
				</button>
			</div>
		</div>
	);
});
