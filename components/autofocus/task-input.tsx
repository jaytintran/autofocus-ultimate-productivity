"use client";

import { useState, useCallback, useRef, KeyboardEvent, useEffect } from "react";
import { Plus, Send } from "lucide-react";
import { TAG_DEFINITIONS, getTagDefinition, type TagId } from "@/lib/tags";
import { Task } from "@/lib/types";
import { parseDueDateShortcut } from "@/lib/utils/due-date-parser";

const TEMPLATES = [
	{ label: "Go", text: "🏍️ Go to " },
	{ label: "Finish", text: "🛫 Finish " },
	{ label: "Do", text: "☑️ Do " },
	{ label: "Read", text: "📖 Read " },
	{ label: "Watch", text: "👀 Watch " },
	{ label: "Write", text: "✍️ Write " },
	{ label: "Call", text: "📞 Call " },
	{ label: "Buy", text: "🛒 Buy " },
	{ label: "Review", text: "Review " },
	{ label: "Research", text: "Research " },
	{ label: "Follow up", text: "Follow Up With " },
	{ label: "Prepare", text: "Prepare " },
	{ label: "Reset", text: "" },
];

// Build tag mention map from TAG_DEFINITIONS e.g. #finish, #explore, #quick
const TAG_MENTION_MAP: Record<string, TagId> = Object.fromEntries(
	TAG_DEFINITIONS.map((tag) => [`#${tag.id}`, tag.id]),
);

// Detect if text contains a tag mention and return { tag, cleanText }
function parseTagMention(text: string): {
	tag: TagId | null;
	cleanText: string;
} {
	const lower = text.toLowerCase();
	for (const [mention, tagId] of Object.entries(TAG_MENTION_MAP)) {
		// Match #tagid at end of string or followed by a space
		const regex = new RegExp(`${mention}(\\s|$)`, "i");
		if (regex.test(lower)) {
			const cleanText = text.replace(regex, "").trim();
			return { tag: tagId, cleanText };
		}
	}
	return { tag: null, cleanText: text };
}

interface TagMentionDropdownProps {
	query: string;
	onSelect: (tagId: TagId) => void;
}

function TagMentionDropdown({ query, onSelect }: TagMentionDropdownProps) {
	const filtered = TAG_DEFINITIONS.filter((tag) =>
		tag.id.startsWith(query.toLowerCase()),
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
						e.preventDefault(); // prevent input blur
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
}

interface TaskInputProps {
	onAddTask: (
		text: string,
		tag?: TagId | null,
		dueDate?: string | null,
	) => Promise<Task | null>;
	selectedTags?: Set<TagId | "none">;
}

export function TaskInput({ onAddTask, selectedTags }: TaskInputProps) {
	const [text, setText] = useState("");
	const [showTemplates, setShowTemplates] = useState(false);
	const [inlineTag, setInlineTag] = useState<TagId | null>(null);
	const [mentionQuery, setMentionQuery] = useState<string | null>(null);
	const [dueDate, setDueDate] = useState<Date | null>(null);
	const [dueDateLabel, setDueDateLabel] = useState<string | null>(null);

	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const activeTag =
		selectedTags && selectedTags.size === 1 && !selectedTags.has("none")
			? (Array.from(selectedTags)[0] as TagId)
			: null;

	// Resolved tag: inline tag from # mention takes priority over filter tag
	const resolvedTag = inlineTag ?? activeTag;
	const tagDefinition = resolvedTag ? getTagDefinition(resolvedTag) : null;

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	// Close template picker when clicking outside
	useEffect(() => {
		if (!showTemplates) return;
		const handler = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setShowTemplates(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [showTemplates]);

	const handleTextChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value;
			setText(value);

			// Detect active # mention being typed (e.g. "#fi", "#exp")
			const mentionMatch = value.match(/#(\w*)$/);
			if (mentionMatch) {
				setMentionQuery(mentionMatch[1]); // the partial word after #
			} else {
				setMentionQuery(null);
			}

			// Detect completed tag mention in text (e.g. "#finish " with trailing space)
			const { tag } = parseTagMention(value);
			setInlineTag(tag);

			// Detect due date shortcut e.g. !2d, !1h30m
			const { dueDate: parsedDueDate, dueDateLabel: parsedLabel } =
				parseDueDateShortcut(value);
			setDueDate(parsedDueDate);
			setDueDateLabel(parsedLabel);
		},
		[],
	);

	const handleSelectMention = useCallback(
		(tagId: TagId) => {
			// Remove the # mention from the text
			const cleanText = text.replace(/#\w*$/, "").trim();
			setText(cleanText);
			setInlineTag(tagId);
			setMentionQuery(null);
			inputRef.current?.focus();
		},
		[text],
	);

	const handleSelectTemplate = useCallback((templateText: string) => {
		setText(templateText);
		setShowTemplates(false);
		setTimeout(() => {
			const input = inputRef.current;
			if (!input) return;
			input.focus();
			input.setSelectionRange(templateText.length, templateText.length);
		}, 0);
	}, []);

	const handleSubmit = useCallback(() => {
		const trimmed = text.trim();
		if (!trimmed) return;

		// Strip any remaining # mention & ! due date from submitted text
		const { cleanText: tagClean } = parseTagMention(trimmed);
		const { cleanText: dueDateClean } = parseDueDateShortcut(
			tagClean || trimmed,
		);
		const finalText = dueDateClean || tagClean || trimmed;

		const EXEMPT_WORDS = new Set([
			"a",
			"an",
			"and",
			"of",
			"the",
			"và",
			"on",
			"to",
			"at",
			"by",
		]);

		const capitalized = finalText
			.split(" ")
			.map((word, index) => {
				if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1);
				if (EXEMPT_WORDS.has(word.toLowerCase())) return word.toLowerCase();
				return word.charAt(0).toUpperCase() + word.slice(1);
			})
			.join(" ");

		setText("");
		setInlineTag(null);
		setMentionQuery(null);
		setDueDate(null);
		setDueDateLabel(null);
		inputRef.current?.focus();

		onAddTask(
			capitalized,
			resolvedTag,
			dueDate ? dueDate.toISOString() : null,
		).catch((error) => {
			console.error("Failed to add task:", error);
		});
	}, [text, onAddTask, resolvedTag]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				// If mention dropdown is open and has exactly one result, select it
				if (mentionQuery !== null) {
					const filtered = TAG_DEFINITIONS.filter((tag) =>
						tag.id.startsWith(mentionQuery.toLowerCase()),
					);
					if (filtered.length === 1) {
						handleSelectMention(filtered[0].id);
						return;
					}
				}
				handleSubmit();
			}
			if (e.key === "Escape") {
				setShowTemplates(false);
				setMentionQuery(null);
			}
		},
		[handleSubmit, handleSelectMention, mentionQuery],
	);

	return (
		<div
			ref={containerRef}
			className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-10"
		>
			{/* Template picker */}
			{showTemplates && (
				<div className="mb-2 bg-card border border-border rounded-2xl shadow-lg p-3">
					<p className="text-[11px] text-muted-foreground mb-2 px-1">
						Choose a template
					</p>
					<div className="flex flex-wrap gap-2">
						{TEMPLATES.map((template) => {
							const isReset = template.label === "Reset";
							return (
								<button
									key={template.label}
									type="button"
									onClick={() => handleSelectTemplate(template.text)}
									className={`px-3 py-1.5 text-xs transition-colors text-foreground
										${
											isReset
												? "border-b border-border rounded-none hover:bg-transparent hover:border-[#8b9a6b]/50"
												: "rounded-full border border-border hover:bg-accent hover:border-[#8b9a6b]/50"
										}`}
								>
									{template.label}
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Input bar */}
			<div className="bg-card border border-border rounded-full shadow-lg px-4 py-2.5 flex items-center gap-3 relative">
				{/* Tag mention dropdown — anchored to input bar */}
				{mentionQuery !== null && (
					<div className="absolute bottom-full left-4 mb-2">
						<TagMentionDropdown
							query={mentionQuery}
							onSelect={handleSelectMention}
						/>
					</div>
				)}

				<button
					type="button"
					onClick={() => setShowTemplates((prev) => !prev)}
					className={`p-0.5 rounded-full transition-colors flex-shrink-0
						${showTemplates ? "text-[#8b9a6b]" : "text-muted-foreground hover:text-foreground"}`}
					title="Choose a template"
				>
					<Plus
						className={`w-5 h-5 transition-transform duration-200
							${showTemplates ? "rotate-45" : "rotate-0"}`}
					/>
				</button>

				{/* Active tag pill — shows filter tag or inline # tag */}
				{tagDefinition && (
					<button
						type="button"
						onClick={() => setInlineTag(null)}
						className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[#8b9a6b]/10 dark:bg-gray-700/50 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive transition-colors group"
						title="Remove tag"
					>
						<span>{tagDefinition.emoji}</span>
						<span>{tagDefinition.label}</span>
						<span className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
							×
						</span>
					</button>
				)}

				<input
					ref={inputRef}
					type="text"
					value={text}
					onChange={handleTextChange}
					onKeyDown={handleKeyDown}
					placeholder="Add a task... or type # to tag, ! for due date"
					className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm"
				/>

				{dueDateLabel && (
					<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex-shrink-0">
						⏰ {dueDateLabel}
					</span>
				)}

				<button
					onClick={handleSubmit}
					disabled={!text.trim()}
					type="button"
					className="p-1.5 hover:bg-accent rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
				>
					<Send className="w-4 h-4 text-[#8b9a6b]" />
				</button>
			</div>
		</div>
	);
}
