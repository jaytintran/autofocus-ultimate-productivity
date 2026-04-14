"use client";

import { TAG_DEFINITIONS, type TagId } from "@/lib/tags";

interface StatsBarProps {
	totalActiveTasks: number;
	taskTagCounts: Record<string, number>;
	selectedTags: Set<TagId | "none">;
	onToggleTag: (tag: TagId | "none" | "all") => void;
	isMobile?: boolean;
}

export function StatsBar({
	totalActiveTasks,
	taskTagCounts,
	selectedTags,
	onToggleTag,
	isMobile = false,
}: StatsBarProps) {
	if (isMobile) {
		return (
			<div className="flex sm:hidden ml-1 items-center justify-left gap-3 px-4 py-1.5 overflow-x-auto border-border/50">
				<span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
					{totalActiveTasks} tasks
				</span>
				<div className="w-px h-3 bg-border shrink-0" />
				{TAG_DEFINITIONS.map((tag) => {
					const count = taskTagCounts[tag.id] ?? 0;
					const isActive = selectedTags.has(tag.id as TagId);
					return (
						<button
							key={tag.id}
							onClick={() => onToggleTag(tag.id as TagId)}
							className={`text-[11px] whitespace-nowrap shrink-0 flex items-center gap-1 rounded px-1 transition-colors
								${
									isActive
										? "text-foreground bg-accent"
										: "text-muted-foreground hover:text-foreground"
								}`}
						>
							<span>{tag.emoji}</span>
							<span>{count}</span>
						</button>
					);
				})}
				<div className="w-px h-3 bg-border shrink-0" />
				<button
					onClick={() => onToggleTag("none")}
					className={`text-[11px] whitespace-nowrap shrink-0 rounded px-1 transition-colors
						${
							selectedTags.has("none")
								? "text-foreground bg-accent"
								: "text-muted-foreground hover:text-foreground"
						}`}
				>
					🏷️ {taskTagCounts.none ?? 0} untagged
				</button>
			</div>
		);
	}

	return (
		<div className="hidden sm:flex items-center gap-3">
			<div className="w-px h-3 bg-border shrink-0" />
			<span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
				Total {totalActiveTasks}
			</span>
			<div className="w-px h-3 bg-border shrink-0" />
			{TAG_DEFINITIONS.map((tag) => {
				const count = taskTagCounts[tag.id] ?? 0;
				const isActive = selectedTags.has(tag.id as TagId);
				return (
					<button
						key={tag.id}
						onClick={() => onToggleTag(tag.id as TagId)}
						className={`relative flex items-center justify-center w-7 h-7 rounded-full transition-colors
						${
							isActive
								? "bg-accent text-foreground"
								: "text-muted-foreground hover:text-foreground hover:bg-accent"
						}`}
					>
						<span className="text-sm leading-none">{tag.emoji}</span>
						{count > 0 && (
							<span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground leading-none border border-border">
								{count}
							</span>
						)}
					</button>
				);
			})}
			<div className="w-px h-3 bg-border shrink-0" />
			<button
				onClick={() => onToggleTag("none")}
				className={`relative flex items-center justify-center w-7 h-7 rounded-full transition-colors
				${
					selectedTags.has("none")
						? "bg-accent text-foreground"
						: "text-muted-foreground hover:text-foreground hover:bg-accent"
				}`}
			>
				<span className="text-xs leading-none">❌</span>
				{(taskTagCounts.none ?? 0) > 0 && (
					<span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground leading-none border border-border">
						{taskTagCounts.none}
					</span>
				)}
			</button>
		</div>
	);
}
