"use client";

import type { TagId } from "@/lib/tags";
import { TagFilter } from "./tag-filter";
import { BacklogDump } from "./backlog-dump";

interface ViewTabsProps {
	activeView: "tasks" | "completed";
	onViewChange: (view: "tasks" | "completed") => void;
	selectedTags: Set<TagId | "none">;
	onToggleTag: (tag: TagId | "none" | "all") => void;
	onAddTasks: (tasks: string[], tag?: TagId | null) => Promise<void>;
}

export function ViewTabs({
	activeView,
	onViewChange,
	selectedTags,
	onToggleTag,
	onAddTasks,
}: ViewTabsProps) {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-3">
			<div className="inline-flex bg-secondary rounded overflow-hidden w-fit">
				<button
					onClick={() => onViewChange("tasks")}
					className={`px-4 py-1.5 text-sm transition-colors ${
						activeView === "tasks"
							? "bg-accent text-foreground"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					Tasks
				</button>
				<button
					onClick={() => onViewChange("completed")}
					className={`px-4 py-1.5 text-sm transition-colors ${
						activeView === "completed"
							? "bg-accent text-foreground"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					Completed
				</button>
			</div>

			<div className="flex items-center gap-2">
				<BacklogDump onAddTasks={onAddTasks} selectedTags={selectedTags} />
				<TagFilter selectedTags={selectedTags} onToggleTag={onToggleTag} />
			</div>
		</div>
	);
}
