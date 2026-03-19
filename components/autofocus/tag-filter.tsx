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
			if (selectedTags.has("none")) return "No 🏷️";
			const tagId = Array.from(selectedTags)[0] as TagId;
			const tag = TAG_DEFINITIONS.find((t) => t.id === tagId);
			return tag ? `${tag.emoji} ${tag.label}` : "Filter";
		}
		return `${selectedTags.size} tags`;
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 gap-2">
					<span className="text-sm">{getButtonLabel()}</span>
					<ChevronDown className="w-3.5 h-3.5 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-48 p-2" align="end">
				<div className="flex flex-col gap-1">
					<button
						onClick={() => {
							onToggleTag("all");
							setOpen(false);
						}}
						className={`flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors text-left ${
							isAllSelected ? "bg-[#8b9a6b] text-white" : "hover:bg-accent"
						}`}
					>
						<span>All Tags</span>
					</button>

					<div className="border-t my-1" />

					{TAG_DEFINITIONS.map((tag) => (
						<button
							key={tag.id}
							onClick={() => onToggleTag(tag.id)}
							className={`flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors text-left ${
								selectedTags.has(tag.id)
									? "bg-[#8b9a6b] text-white"
									: "hover:bg-accent"
							}`}
						>
							<span>{tag.emoji}</span>
							<span>{tag.label}</span>
						</button>
					))}

					<div className="border-t my-1" />

					<button
						onClick={() => onToggleTag("none")}
						className={`flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors text-left ${
							selectedTags.has("none")
								? "bg-[#8b9a6b] text-white"
								: "hover:bg-accent"
						}`}
					>
						<span>No 🏷️</span>
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
