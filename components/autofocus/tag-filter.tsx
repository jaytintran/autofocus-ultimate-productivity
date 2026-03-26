"use client";

import { useState } from "react";
import { TAG_DEFINITIONS, type TagId } from "@/lib/tags";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface TagFilterProps {
	selectedTags: Set<TagId | "none">;
	onToggleTag: (tag: TagId | "none" | "all") => void;
}

export function TagFilter({ selectedTags, onToggleTag }: TagFilterProps) {
	const [open, setOpen] = useState(false);
	const isAllSelected = selectedTags.size === 0;

	const getButtonLabel = () => {
		if (isAllSelected) return "All Tags";
		if (selectedTags.size === 1) {
			if (selectedTags.has("none")) return "No Tags";
			const tagId = Array.from(selectedTags)[0] as TagId;
			const tag = TAG_DEFINITIONS.find((t) => t.id === tagId);
			return tag ? `${tag.emoji} ${tag.label}` : "Filter";
		}
		return `${selectedTags.size} 🏷️`;
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 rounded">
					<span className="text-sm">{getButtonLabel()}</span>
					<ChevronDown
						className={`w-3 h-3 opacity-50 transition-transform ${open ? "rotate-180" : ""}`}
					/>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-48 p-2" align="end">
				<div className="flex flex-col gap-1">
					{/* Preset Options - No Checkboxes */}
					<button
						onClick={() => {
							onToggleTag("all");
							setOpen(false);
						}}
						className={`
							w-full text-left py-2 px-3 text-sm rounded hover:bg-accent transition-colors text-left
							${
								isAllSelected
									? "bg-accent text-accent-foreground"
									: "text-muted-foreground hover:text-foreground"
							}
						`}
					>
						All Tags
					</button>

					<button
						onClick={() => {
							onToggleTag("none");
							setOpen(false);
						}}
						className={`
							w-full text-left py-2 px-3 text-sm rounded hover:bg-accent transition-colors text-left
							${
								selectedTags.has("none")
									? "bg-accent text-accent-foreground"
									: "text-muted-foreground hover:text-foreground"
							}
						`}
					>
						No Tags
					</button>

					{/* Divider */}
					<div className="border-t my-1" />

					{/* Tag Options with Checkboxes */}
					{TAG_DEFINITIONS.map((tag) => (
						<button
							key={tag.id}
							onClick={() => onToggleTag(tag.id)}
							className={`flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors text-left ${
								selectedTags.has(tag.id)
									? "bg-[#8b9a6b]/15 text-[#8b9a6b]"
									: "text-muted-foreground hover:text-foreground hover:bg-accent"
							}`}
						>
							<div
								className={`
								w-3 h-3 rounded border flex items-center justify-center
								${
									selectedTags.has(tag.id)
										? "bg-[#8b9a6b] border-[#8b9a6b]"
										: "border-muted-foreground"
								}
							`}
							>
								{selectedTags.has(tag.id) && (
									<svg
										className="w-2.5 h-2.5 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={3}
											d="M5 13l4 4L19 7"
										/>
									</svg>
								)}
							</div>
							<span>{tag.emoji}</span>
							<span>{tag.label}</span>
						</button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
