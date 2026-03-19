"use client";

import { useState, useCallback } from "react";
import { ListPlus } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BacklogDumpProps {
	onAddTasks: (tasks: string[]) => Promise<void>;
}

export function BacklogDump({ onAddTasks }: BacklogDumpProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [text, setText] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = useCallback(async () => {
		const lines = text
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		if (lines.length === 0 || isLoading) return;

		setIsLoading(true);
		try {
			await onAddTasks(lines);
			setText("");
			setIsOpen(false);
		} finally {
			setIsLoading(false);
		}
	}, [text, isLoading, onAddTasks]);

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={() => setIsOpen(true)}
				className="h-8 gap-2"
			>
				<ListPlus className="w-3.5 h-3.5" />
				<span className="text-sm">Bulk Add</span>
			</Button>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>Bulk Add Tasks</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 pt-4">
						<p className="text-xs text-muted-foreground">
							Paste multiple tasks, one per line. They will be added to the end
							of your list.
						</p>
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
