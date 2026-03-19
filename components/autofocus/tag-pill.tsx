"use client";

import { getTagDefinition, type TagId } from "@/lib/tags";

interface TagPillProps {
	tagId: TagId;
	onClick?: () => void;
}

export function TagPill({ tagId, onClick }: TagPillProps) {
	const tag = getTagDefinition(tagId);
	if (!tag) return null;

	return (
		<button
			onClick={onClick}
			className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[#8b9a6b]/10 dark:bg-gray-700/50 hover:bg-[#8b9a6b]/20 dark:hover:bg-gray-700 transition-colors"
		>
			<span>{tag.emoji}</span>
			<span>{tag.label}</span>
		</button>
	);
}
