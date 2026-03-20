"use client";

import { useState, useCallback, useRef, KeyboardEvent, useEffect } from "react";
import { Plus, Send } from "lucide-react";
import { getTagDefinition, type TagId } from "@/lib/tags";

interface TaskInputProps {
	onAddTask: (text: string, tag?: TagId | null) => Promise<void>;
	selectedTags?: Set<TagId | "none">;
}

export function TaskInput({ onAddTask, selectedTags }: TaskInputProps) {
	const [text, setText] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const activeTag =
		selectedTags && selectedTags.size === 1 && !selectedTags.has("none")
			? (Array.from(selectedTags)[0] as TagId)
			: null;

	const tagDefinition = activeTag ? getTagDefinition(activeTag) : null;

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const handleSubmit = useCallback(() => {
		const trimmed = text.trim();
		if (!trimmed) return;

		const capitalized = trimmed
			.split(" ")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");

		// Clear and refocus immediately — don't wait for server
		setText("");
		inputRef.current?.focus();

		// Fire and forget — same pattern as the parent
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
		},
		[handleSubmit],
	);

	return (
		<div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-10">
			<div className="bg-card border border-border rounded-full shadow-lg px-4 py-2.5 flex items-center gap-3">
				<Plus className="w-5 h-5 text-muted-foreground flex-shrink-0" />

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
