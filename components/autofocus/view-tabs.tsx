"use client";

import { useState } from "react";
import type { TagId } from "@/lib/tags";
import { TagFilter } from "./tag-filter";
import { BacklogDump } from "./backlog-dump";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
	ArrowDownUp,
	Clock,
	AlarmClock,
	ArrowUpDown,
	LayoutList,
	CalendarDays,
} from "lucide-react";

export type CompletedSortKey =
	| "default"
	| "completed_desc"
	| "completed_asc"
	| "time_spent_desc";

export type CompletedViewType = "default" | "7days";

const SORT_OPTIONS: {
	key: CompletedSortKey;
	label: string;
	icon: React.ElementType;
}[] = [
	{ key: "completed_desc", label: "Newest", icon: Clock },
	{ key: "completed_asc", label: "Oldest", icon: AlarmClock },
	{ key: "time_spent_desc", label: "Most Time", icon: ArrowDownUp },
	{ key: "default", label: "Default", icon: LayoutList },
];

interface SortSelectorProps {
	value: CompletedSortKey;
	onChange: (sort: CompletedSortKey) => void;
}

interface ViewTypeToggleProps {
	value: CompletedViewType;
	onChange: (view: CompletedViewType) => void;
}

function SortSelector({ value, onChange }: SortSelectorProps) {
	const [open, setOpen] = useState(false);
	const current = SORT_OPTIONS.find((o) => o.key === value) ?? SORT_OPTIONS[0];
	const Icon = current.icon;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 rounded">
					<span className="text-sm">{current.label}</span>
					<ArrowUpDown className="w-3 h-3 opacity-50 -mr-1" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-48 p-2" align="end">
				<div className="flex flex-col gap-1">
					{SORT_OPTIONS.map((option) => {
						return (
							<button
								key={option.key}
								onClick={() => {
									onChange(option.key);
									setOpen(false);
								}}
								className={`flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors text-left ${
									value === option.key
										? "bg-[#8b9a6b] text-white"
										: "hover:bg-accent"
								}`}
							>
								<span>{option.label}</span>
							</button>
						);
					})}
				</div>
			</PopoverContent>
		</Popover>
	);
}

function ViewTypeToggle({ value, onChange }: ViewTypeToggleProps) {
	return (
		<div className="inline-flex bg-secondary rounded overflow-hidden">
			<Button
				variant="outline"
				size="sm"
				onClick={() => onChange("default")}
				className={`h-8 rounded text-xs transition-colors ${
					value === "default"
						? "bg-accent! text-foreground"
						: "text-muted-foreground hover:text-foreground"
				}`}
				title="Default view"
			>
				<LayoutList className="w-3 h-3" />
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={() => onChange("7days")}
				className={`h-8 rounded text-xs transition-colors ${
					value === "7days"
						? "bg-accent! text-foreground"
						: "text-muted-foreground hover:text-foreground"
				}`}
				title="7 days view"
			>
				<CalendarDays className="w-3.5 h-3.5" />
			</Button>
		</div>
	);
}

interface ViewTabsProps {
	activeView: "tasks" | "completed";
	onViewChange: (view: "tasks" | "completed") => void;
	selectedTags: Set<TagId | "none">;
	onToggleTag: (tag: TagId | "none" | "all") => void;
	onAddTasks: (tasks: string[], tag?: TagId | null) => Promise<void>;
	completedSort: CompletedSortKey;
	onCompletedSortChange: (sort: CompletedSortKey) => void;
	completedViewType: CompletedViewType;
	onCompletedViewTypeChange: (view: CompletedViewType) => void;
}

export function ViewTabsOld({
	activeView,
	onViewChange,
	selectedTags,
	onToggleTag,
	onAddTasks,
	completedSort,
	onCompletedSortChange,
}: ViewTabsProps) {
	return (
		<div className="flex flex-row justify-between sm:flex-row sm:items-center sm:justify-between px-4 py-3">
			<div className="inline-flex bg-secondary rounded overflow-hidden w-fit">
				<button
					onClick={() => onViewChange("tasks")}
					className={`px-3 py-1.5 text-sm transition-colors ${
						activeView === "tasks"
							? "bg-accent text-foreground"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					Tasks
				</button>
				<button
					onClick={() => onViewChange("completed")}
					className={`px-3 py-1.5 text-sm transition-colors ${
						activeView === "completed"
							? "bg-accent text-foreground"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					Completed
				</button>
			</div>

			<div className="flex items-center gap-2">
				{/* Bulk add — tasks view only */}
				{activeView === "tasks" && (
					<BacklogDump onAddTasks={onAddTasks} selectedTags={selectedTags} />
				)}

				{/* Sort selector — completed view only */}
				{activeView === "completed" && (
					<SortSelector
						value={completedSort}
						onChange={onCompletedSortChange}
					/>
				)}

				<TagFilter selectedTags={selectedTags} onToggleTag={onToggleTag} />
			</div>
		</div>
	);
}

export function ViewTabs({
	activeView,
	onViewChange,
	selectedTags,
	onToggleTag,
	onAddTasks,
	completedSort,
	onCompletedSortChange,
	completedViewType,
	onCompletedViewTypeChange,
}: ViewTabsProps) {
	return (
		<div className="flex flex-row justify-between sm:flex-row sm:items-center sm:justify-between px-4 py-3">
			<div className="inline-flex bg-secondary rounded overflow-hidden w-fit">
				<button
					onClick={() => onViewChange("tasks")}
					className={`px-3 py-1.5 text-sm transition-colors ${
						activeView === "tasks"
							? "bg-accent text-foreground"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					Tasks
				</button>
				<button
					onClick={() => onViewChange("completed")}
					className={`px-3 py-1.5 text-sm transition-colors ${
						activeView === "completed"
							? "bg-accent text-foreground"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					Completed
				</button>
			</div>

			<div className="flex items-center gap-2">
				{activeView === "tasks" && (
					<BacklogDump onAddTasks={onAddTasks} selectedTags={selectedTags} />
				)}
				{activeView === "completed" && (
					<>
						<ViewTypeToggle
							value={completedViewType}
							onChange={onCompletedViewTypeChange}
						/>
						<SortSelector
							value={completedSort}
							onChange={onCompletedSortChange}
						/>
					</>
				)}
				<TagFilter selectedTags={selectedTags} onToggleTag={onToggleTag} />
			</div>
		</div>
	);
}
