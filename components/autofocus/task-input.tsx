"use client";

import { useState, useCallback, useRef, KeyboardEvent, useEffect } from "react";
import { Plus, Send } from "lucide-react";

interface TaskInputProps {
	onAddTask: (text: string) => Promise<void>;
}

export function TaskInput({ onAddTask }: TaskInputProps) {
	const [text, setText] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const handleSubmit = useCallback(async () => {
		const trimmed = text.trim();
		if (!trimmed || isLoading) return;

		// Capitalize first letter of each word
		const capitalized = trimmed
			.split(" ")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(" ");

		setIsLoading(true);
		setText("");

		try {
			await onAddTask(capitalized);
		} finally {
			setIsLoading(false);
			inputRef.current?.focus();
		}
	}, [text, isLoading, onAddTask]);

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
				<input
					ref={inputRef}
					type="text"
					value={text}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Add a task..."
					disabled={isLoading}
					autoFocus
					className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground disabled:opacity-50 text-sm"
				/>
				<button
					onClick={handleSubmit}
					disabled={!text.trim() || isLoading}
					type="button"
					className="p-2 rounded-full bg-[#8b9a6b] text-white hover:bg-[#8b9a6b]/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
					aria-label="Add task"
				>
					<Send className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
}
