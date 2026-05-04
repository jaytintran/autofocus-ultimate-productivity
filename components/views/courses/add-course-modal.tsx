"use client";

import { useState } from "react";
import type { Course, CoursePriority } from "@/lib/db/courses";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PRIORITY_CONFIG } from "./constants";

export function AddCourseModal({
	onClose,
	onAdd,
	categories,
}: {
	onClose: () => void;
	onAdd: (course: Omit<Course, "id" | "created_at" | "updated_at">) => Promise<void>;
	categories: string[];
}) {
	const [title, setTitle] = useState("");
	const [category, setCategory] = useState("");
	const [customCategory, setCustomCategory] = useState("");
	const [priority, setPriority] = useState<CoursePriority | null>(null);
	const [platform, setPlatform] = useState("");
	const [instructor, setInstructor] = useState("");
	const [url, setUrl] = useState("");
	const [isAdding, setIsAdding] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim()) return;

		const finalCategory =
			category === "__custom__" ? customCategory.trim() : category;
		if (!finalCategory) return;

		setIsAdding(true);
		try {
			await onAdd({
				title: title.trim(),
				category: finalCategory,
				priority,
				status: "not_started",
				description: null,
				progress: null,
				platform: platform.trim() || null,
				instructor: instructor.trim() || null,
				url: url.trim() || null,
				duration: null,
				completion_date: null,
				certificate_url: null,
				notes: null,
			});
			onClose();
		} finally {
			setIsAdding(false);
		}
	};

	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle>Add New Course</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 mt-4">
					{/* Title */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Course Title</label>
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="e.g., Complete React Developer Course"
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							autoFocus
						/>
					</div>

					{/* Category */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Category</label>
						<select
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="">Select a category</option>
							{categories.map((cat) => (
								<option key={cat} value={cat}>
									{cat}
								</option>
							))}
							<option value="__custom__">+ New Category</option>
						</select>
					</div>

					{/* Custom Category */}
					{category === "__custom__" && (
						<div className="space-y-2">
							<label className="text-sm font-medium">New Category Name</label>
							<input
								type="text"
								value={customCategory}
								onChange={(e) => setCustomCategory(e.target.value)}
								placeholder="Enter category name"
								className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
					)}

					{/* Platform */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Platform (optional)</label>
						<input
							type="text"
							value={platform}
							onChange={(e) => setPlatform(e.target.value)}
							placeholder="e.g., Udemy, Coursera, YouTube"
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						/>
					</div>

					{/* Instructor */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Instructor (optional)</label>
						<input
							type="text"
							value={instructor}
							onChange={(e) => setInstructor(e.target.value)}
							placeholder="Instructor name"
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						/>
					</div>

					{/* URL */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Course URL (optional)</label>
						<input
							type="url"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder="https://..."
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						/>
					</div>

					{/* Priority */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Priority (optional)</label>
						<div className="flex gap-2 flex-wrap">
							{Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
								<button
									key={key}
									type="button"
									onClick={() =>
										setPriority(priority === key ? null : (key as CoursePriority))
									}
									className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
										priority === key
											? `${config.bg} ${config.color} border-transparent`
											: "border-border text-muted-foreground hover:border-foreground/20"
									}`}
								>
									{config.label}
								</button>
							))}
						</div>
					</div>

					{/* Actions */}
					<div className="flex gap-2 justify-end pt-4">
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={isAdding || !title.trim()}>
							{isAdding ? "Adding..." : "Add Course"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
