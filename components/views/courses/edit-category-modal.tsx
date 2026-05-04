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
	onSave: (newName: string) => Promise<void>;
}) {
	const [name, setName] = useState(category);
	const [isSaving, setIsSaving] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim() || name === category) {
			onClose();
			return;
		}

		setIsSaving(true);
		try {
			await onSave(name.trim());
			onClose();
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[400px]">
				<DialogHeader>
					<DialogTitle>Edit Category</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 mt-4">
					<div className="space-y-2">
						<label className="text-sm font-medium">Category Name</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Enter category name"
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							autoFocus
						/>
					</div>

					<div className="flex gap-2 justify-end pt-4">
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSaving || !name.trim()}>
							{isSaving ? "Saving..." : "Save"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
