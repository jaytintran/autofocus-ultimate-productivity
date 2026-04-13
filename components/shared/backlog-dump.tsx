"use client";

import { useState, useCallback } from "react";
import { ListPlus } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TagId } from "@/lib/tags";

interface BacklogDumpProps {
	onAddTasks: (tasks: string[], tag?: TagId | null) => Promise<void>;
	selectedTags?: Set<TagId | "none">;
}

export function BacklogDump({ onAddTasks, selectedTags }: BacklogDumpProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [text, setText] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	// Determine active tag
	const activeTag =
		selectedTags && selectedTags.size === 1 && !selectedTags.has("none")
			? (Array.from(selectedTags)[0] as TagId)
			: null;

	const handleSubmit = useCallback(async () => {
		const lines = text
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.map((line) =>
				line
					.split(" ")
					.map(
						(word) =>
							word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
					)
					.join(" "),
			);

		if (lines.length === 0 || isLoading) return;

		setIsLoading(true);
		try {
			await onAddTasks(lines, activeTag);
			setText("");
			setIsOpen(false);
		} finally {
			setIsLoading(false);
		}
	}, [text, isLoading, onAddTasks, activeTag]);

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={() => setIsOpen(true)}
				className="h-8 rounded"
			>
				<ListPlus className="w-3.5 h-3.5" />
				<span className="text-sm">Bulk +</span>
			</Button>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>Bulk Add Tasks</DialogTitle>
						<DialogDescription>
							Paste multiple tasks, one per line. They will be added to the end
							of your list.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 pt-4">
						<textarea
							value={text}
							onChange={(e) => setText(e.target.value)}
							placeholder="Buy groceries&#10;Call mom&#10;Review project proposal&#10;..."
							disabled={isLoading}
							className="w-full min-h-[200px] bg-input border border-border rounded p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
							autoFocus
						/>
						<div className="flex justify-end gap-2">
							<button
								onClick={() => setIsOpen(false)}
								disabled={isLoading}
								className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								onClick={handleSubmit}
								disabled={!text.trim() || isLoading}
								className="px-4 py-2 text-sm bg-[#8b9a6b] text-white rounded hover:bg-[#8b9a6b]/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
							>
								{isLoading ? "Adding..." : "Add All"}
							</button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
