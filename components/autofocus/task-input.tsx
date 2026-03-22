"use client";

import { useState, useCallback, useRef, KeyboardEvent, useEffect } from "react";
import { Plus, Send } from "lucide-react";
import { getTagDefinition, type TagId } from "@/lib/tags";

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

interface TaskInputProps {
	onAddTask: (text: string, tag?: TagId | null) => Promise<void>;
	selectedTags?: Set<TagId | "none">;
}

export function TaskInput({ onAddTask, selectedTags }: TaskInputProps) {
	const [text, setText] = useState("");
	const [showTemplates, setShowTemplates] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const activeTag =
		selectedTags && selectedTags.size === 1 && !selectedTags.has("none")
			? (Array.from(selectedTags)[0] as TagId)
			: null;

	const tagDefinition = activeTag ? getTagDefinition(activeTag) : null;

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

	const handleSelectTemplate = useCallback((templateText: string) => {
		setText(templateText);
		setShowTemplates(false);
		// Focus and place cursor at end
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

		const capitalized = trimmed
			.split(" ")
			.map((word, index) => {
				// Always capitalize the first word regardless
				if (index === 0) {
					return word.charAt(0).toUpperCase() + word.slice(1);
				}
				// Exempt small words stay lowercase
				if (EXEMPT_WORDS.has(word.toLowerCase())) {
					return word.toLowerCase();
				}
				return word.charAt(0).toUpperCase() + word.slice(1);
			})
			.join(" ");

		setText("");
		inputRef.current?.focus();

		onAddTask(capitalized, activeTag).catch((error) => {
			console.error("Failed to add task:", error);
		});
	}, [text, onAddTask, activeTag]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSubmit();
			}
			if (e.key === "Escape") {
				setShowTemplates(false);
			}
		},
		[handleSubmit],
	);

	return (
		<div
			ref={containerRef}
			className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-10"
		>
			{/* Template picker — appears above the input bar */}
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
									}
								`}
								>
									{template.label}
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Input bar */}
			<div className="bg-card border border-border rounded-full shadow-lg px-4 py-2.5 flex items-center gap-3">
				<button
					type="button"
					onClick={() => setShowTemplates((prev) => !prev)}
					className={`
						p-0.5 rounded-full transition-colors flex-shrink-0
						${
							showTemplates
								? "text-[#8b9a6b]"
								: "text-muted-foreground hover:text-foreground"
						}
					`}
					title="Choose a template"
				>
					<Plus
						className={`
							w-5 h-5 transition-transform duration-200
							${showTemplates ? "rotate-45" : "rotate-0"}
						`}
					/>
				</button>

				{tagDefinition && (
					<div className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[#8b9a6b]/10 dark:bg-gray-700/50 flex-shrink-0">
						<span>{tagDefinition.emoji}</span>
						<span>{tagDefinition.label}</span>
					</div>
				)}

				<input
					ref={inputRef}
					type="text"
					value={text}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Add a task..."
					className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm"
				/>
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
