"use client";

import { useState } from "react";
import { TAG_DEFINITIONS, type TagId } from "@/lib/tags";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface TagPickerProps {
	currentTag: TagId | null;
	onSelectTag: (tag: TagId | null) => void;
	disabled?: boolean;
}

export function TagPicker({
	currentTag,
	onSelectTag,
	disabled,
}: TagPickerProps) {
	const [open, setOpen] = useState(false);

	const handleSelect = (tag: TagId | null) => {
		onSelectTag(tag);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					disabled={disabled}
					className="h-8 w-8 p-0"
				>
					#
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-48 p-2" align="end">
				<div className="flex flex-col gap-1">
					{TAG_DEFINITIONS.map((tag) => (
						<button
							key={tag.id}
							onClick={() => handleSelect(tag.id)}
							className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-accent transition-colors text-left"
						>
							<span>{tag.emoji}</span>
							<span>{tag.label}</span>
						</button>
					))}
					{currentTag && (
						<>
							<div className="border-t my-1" />
							<button
								onClick={() => handleSelect(null)}
								className="px-3 py-2 text-sm rounded hover:bg-accent transition-colors text-left text-muted-foreground"
							>
								Remove tag
							</button>
						</>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
