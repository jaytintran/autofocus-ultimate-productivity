"use client";

import { useState } from "react";
import type { TagId } from "@/lib/tags";
import type { ContentFilterState } from "@/lib/content-filter";
import { TagFilter } from "./tag-filter";
import { BacklogDump } from "./backlog-dump";
import { ContentFilterBar } from "./content-filter-bar";
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
	SquareCheckBig,
	Square,
	SquareCheck,
	BookMarked,
	LayoutDashboard,
	GalleryHorizontalEnd,
	BookOpen,
} from "lucide-react";

export type CompletedSortKey =
	| "default"
	| "completed_desc"
	| "completed_asc"
	| "time_spent_desc";

export type CompletedViewType = "bullet" | "default" | "7days";

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

function MainViewToggle({
	activeView,
	onChange,
}: {
	activeView: "tasks" | "completed";
	onChange: (view: "tasks" | "completed") => void;
}) {
	return (
		<div className="inline-flex bg-secondary rounded overflow-hidden w-fit">
			<Button
				variant="outline"
				size="sm"
				onClick={() => onChange("tasks")}
				className={`h8 rounded text-xs transition-colors ${
					activeView === "tasks"
						? "bg-accent! text-foreground"
						: "text-muted-foreground hover:text-foreground"
				}`}
				title="Tasks View"
			>
				<span className="max-sm:hidden">Tasks</span>
				<Square className="w-3.5 h-3.5 sm:hidden" />
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={() => onChange("completed")}
				className={`h8 rounded text-xs transition-colors ${
					activeView === "completed"
						? "bg-accent! text-foreground"
						: "text-muted-foreground hover:text-foreground"
				}`}
				title="Completed View"
			>
				<span className="max-sm:hidden">Completed</span>
				<SquareCheck className="w-3.5 h-3.5 sm:hidden" />
			</Button>
		</div>
	);
}

function ViewTypeToggle({ value, onChange }: ViewTypeToggleProps) {
	return (
		<div className="inline-flex bg-secondary rounded overflow-hidden">
			<Button
				variant="outline"
				size="sm"
				onClick={() => onChange("bullet")}
				className={`h-8 rounded text-xs transition-colors ${
					value === "bullet"
						? "bg-accent! text-foreground"
						: "text-muted-foreground hover:text-foreground"
				}`}
				title="Bullet Journal View"
			>
				<BookOpen className="w-3 h-3" />
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={() => onChange("default")}
				className={`h-8 rounded text-xs transition-colors ${
					value === "default"
						? "bg-accent! text-foreground"
						: "text-muted-foreground hover:text-foreground"
				}`}
				title="Linear View"
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
				title="7 Days View"
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
	contentFilter: ContentFilterState;
	onChangeContentFilter: (filter: ContentFilterState) => void;
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
	contentFilter,
	onChangeContentFilter,
}: ViewTabsProps) {
	return (
		<div className="flex flex-row flex-wrap gap-2 justify-between sm:flex-row sm:items-center sm:justify-between px-4 py-3">
			<div className="flex gap-2 w-full justify-between">
				<MainViewToggle activeView={activeView} onChange={onViewChange} />

				{activeView === "completed" && (
					<ViewTypeToggle
						value={completedViewType}
						onChange={onCompletedViewTypeChange}
					/>
				)}
			</div>

			<div className="flex items-center gap-2">
				{activeView === "tasks" && (
					<>
						<BacklogDump onAddTasks={onAddTasks} selectedTags={selectedTags} />
					</>
				)}
				<ContentFilterBar
					value={contentFilter}
					onChange={onChangeContentFilter}
				/>
				<TagFilter selectedTags={selectedTags} onToggleTag={onToggleTag} />
				{activeView === "completed" && (
					<>
						<SortSelector
							value={completedSort}
							onChange={onCompletedSortChange}
						/>
					</>
				)}
			</div>
		</div>
	);
}
