"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function EditCategoryModal({
	category,
	onClose,
	onSave,
}: {
	category: string;
	onClose: () => void;
	onSave: (name: string) => void;
}) {
	const [value, setValue] = useState(category);
	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[400px] p-0 overflow-hidden flex flex-col">
				<div className="px-6 pt-5 pb-4">
					<DialogHeader>
						<DialogTitle>Edit Category</DialogTitle>
					</DialogHeader>
				</div>
				<div className="px-6 pb-6 space-y-4 border-t border-border/60 pt-4 bg-secondary/20">
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Name
						</label>
						<input
							value={value}
							onChange={(e) => setValue(e.target.value)}
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
						/>
					</div>
					<div className="flex justify-end gap-2 pt-1">
						<Button variant="outline" size="sm" onClick={onClose}>
							Cancel
						</Button>
						<Button
							size="sm"
							disabled={!value.trim()}
							onClick={() => {
								onSave(value.trim());
								onClose();
							}}
						>
							Save
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
