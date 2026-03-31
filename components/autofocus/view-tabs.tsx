// view-tabs.tsx
"use client";

import { useState, useCallback } from "react";
import {
	ArrowDownUp,
	Clock,
	AlarmClock,
	ArrowUpDown,
	LayoutList,
	CalendarDays,
	Square,
	SquareCheck,
	BookMarked,
	LayoutDashboard,
	GalleryHorizontalEnd,
	BookOpen,
	Filter,
	SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	SheetFooter,
	SheetClose,
} from "@/components/ui/sheet";
import { TagFilter } from "./tag-filter";
import { BacklogDump } from "./backlog-dump";
import { ContentFilterBar } from "./content-filter-bar";
import type { TagId } from "@/lib/tags";
import type { ContentFilterState } from "@/lib/content-filter";

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

// =============================================================================
// MOBILE FILTER COMPONENTS
// =============================================================================

interface MobileFilterSheetProps {
	activeFilterCount: number;
	children: React.ReactNode;
	title?: string;
}

function MobileFilterSheet({
	activeFilterCount,
	children,
	title = "Filters",
}: MobileFilterSheetProps) {
	const [open, setOpen] = useState(false);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="h-8 gap-2 md:hidden relative"
				>
					<SlidersHorizontal className="w-4 h-4" />
					<span className="hidden sm:inline">Filters</span>
					{activeFilterCount > 0 && (
						<Badge
							variant="secondary"
							className="absolute -top-2 -right-2 h-3.5 w-3.5 p-0 flex items-center justify-center text-xs bg-[#8b9a6b] text-white border-0"
						>
							{activeFilterCount}
						</Badge>
					)}
				</Button>
			</SheetTrigger>
			<SheetContent side="bottom" className="h-auto max-h-[85vh] md:hidden p-5">
				<SheetHeader className="pb-4 border-b">
					<SheetTitle>{title}</SheetTitle>
				</SheetHeader>
				<div className="py-6 space-y-6 overflow-y-auto">{children}</div>
				<SheetFooter className="pt-4 border-t">
					<SheetClose asChild>
						<Button className="w-full bg-[#8b9a6b] hover:bg-[#8b9a6b]/90">
							Done
						</Button>
					</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

// =============================================================================
// SORT SELECTOR (Desktop Popover / Mobile Sheet)
// =============================================================================

interface SortSelectorProps {
	value: CompletedSortKey;
	onChange: (sort: CompletedSortKey) => void;
}

function SortSelector({ value, onChange }: SortSelectorProps) {
	const [open, setOpen] = useState(false);
	const current = SORT_OPTIONS.find((o) => o.key === value) ?? SORT_OPTIONS[0];
	const Icon = current.icon;

	const handleSelect = useCallback(
		(key: CompletedSortKey) => {
			onChange(key);
			setOpen(false);
		},
		[onChange],
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 gap-2">
					<Icon className="w-3.5 h-3.5" />
					<span className="hidden sm:inline">{current.label}</span>
					<ArrowUpDown className="w-3 h-3 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-48 p-2" align="end">
				<div className="flex flex-col gap-1">
					{SORT_OPTIONS.map((option, index) => (
						<button
							key={option.key}
							onClick={() => handleSelect(option.key)}
							className={`flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors text-left ${
								value === option.key
									? "bg-[#8b9a6b] text-white"
									: "hover:bg-accent"
							}`}
						>
							<option.icon className="w-4 h-4" />
							<span>{option.label}</span>
						</button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}

// Mobile version of sort selector
function MobileSortSelector({ value, onChange }: SortSelectorProps) {
	const current = SORT_OPTIONS.find((o) => o.key === value) ?? SORT_OPTIONS[0];

	return (
		<div className="space-y-3">
			<h4 className="text-sm font-medium text-muted-foreground">Sort Order</h4>
			<div className="grid grid-cols-2 gap-2">
				{SORT_OPTIONS.map((option, index) => {
					const Icon = option.icon;
					return (
						<button
							key={option.key}
							onClick={() => onChange(option.key)}
							className={`flex items-center gap-2 px-3 py-3 text-sm rounded-lg border transition-all ${
								value === option.key
									? "border-[#8b9a6b] bg-[#8b9a6b]/10 text-foreground"
									: "border-border hover:border-foreground/30 text-muted-foreground"
							}`}
						>
							<Icon className="w-4 h-4" />
							<span>{option.label}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

// =============================================================================
// VIEW TYPE TOGGLE (Desktop Inline / Mobile in Sheet)
// =============================================================================

interface ViewTypeToggleProps {
	value: CompletedViewType;
	onChange: (view: CompletedViewType) => void;
}

function ViewTypeToggle({ value, onChange }: ViewTypeToggleProps) {
	return (
		<div className="hidden sm:inline-flex bg-secondary rounded overflow-hidden">
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

// Mobile version
function MobileViewTypeToggle({ value, onChange }: ViewTypeToggleProps) {
	const options = [
		{
			key: "bullet" as const,
			label: "Bullet",
			icon: BookOpen,
			desc: "Journal style",
		},
		{
			key: "default" as const,
			label: "List",
			icon: LayoutList,
			desc: "Simple list",
		},
		{
			key: "7days" as const,
			label: "7 Days",
			icon: CalendarDays,
			desc: "Week columns",
		},
	];

	return (
		<div className="space-y-3">
			<h4 className="text-sm font-medium text-muted-foreground">View Style</h4>
			<div className="grid grid-cols-3 gap-2">
				{options.map((option) => {
					const Icon = option.icon;
					return (
						<button
							key={option.key}
							onClick={() => onChange(option.key)}
							className={`flex flex-col items-center gap-1 px-3 py-3 text-xs rounded-lg border transition-all ${
								value === option.key
									? "border-[#8b9a6b] bg-[#8b9a6b]/10 text-foreground"
									: "border-border hover:border-foreground/30 text-muted-foreground"
							}`}
						>
							<Icon className="w-5 h-5 mb-1" />
							<span className="font-medium">{option.label}</span>
							<span className="text-[10px] opacity-60">{option.desc}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

// =============================================================================
// MAIN VIEW TOGGLE (Tasks / Completed)
// =============================================================================

interface MainViewToggleProps {
	activeView: "tasks" | "completed";
	onChange: (view: "tasks" | "completed") => void;
}

function MainViewToggle({ activeView, onChange }: MainViewToggleProps) {
	return (
		<div className="inline-flex bg-secondary rounded overflow-hidden w-fit">
			<Button
				variant="outline"
				size="sm"
				onClick={() => onChange("tasks")}
				className={`h-8 rounded text-xs transition-colors ${
					activeView === "tasks"
						? "bg-accent! text-foreground"
						: "text-muted-foreground hover:text-foreground"
				}`}
			>
				<span className="hidden sm:inline">Tasks</span>
				<Square className="w-3.5 h-3.5 sm:hidden" />
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={() => onChange("completed")}
				className={`h-8 rounded text-xs transition-colors ${
					activeView === "completed"
						? "bg-accent! text-foreground"
						: "text-muted-foreground hover:text-foreground"
				}`}
			>
				<span className="hidden sm:inline">Completed</span>
				<SquareCheck className="w-3.5 h-3.5 sm:hidden" />
			</Button>
		</div>
	);
}

// =============================================================================
// MAIN VIEW TABS COMPONENT
// =============================================================================

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
	// Calculate active filter count for badge
	const activeFilterCount =
		selectedTags.size +
		(contentFilter.preset !== "show-all" ? 1 : 0) +
		(activeView === "completed" && completedSort !== "default" ? 1 : 0);

	return (
		<div className="flex flex-row flex-wrap gap-2 justify-between items-center px-4 py-3">
			{/* Left side - Main view toggle */}
			<div className="flex gap-2">
				<MainViewToggle activeView={activeView} onChange={onViewChange} />

				{/* Desktop: Show view type toggle inline */}
				{activeView === "completed" && (
					<ViewTypeToggle
						value={completedViewType}
						onChange={onCompletedViewTypeChange}
					/>
				)}
			</div>

			{/* Right side - Filters */}
			<div className="flex items-center gap-2">
				{/* Tasks-specific: Backlog Dump */}
				{activeView === "tasks" && (
					<div className="space-y-3 md:hidden">
						<BacklogDump onAddTasks={onAddTasks} selectedTags={selectedTags} />
					</div>
				)}

				{/* MOBILE: Everything in Sheet */}
				<MobileFilterSheet activeFilterCount={activeFilterCount}>
					{/* Content Filter */}
					<div className="flex flex-row justify-start gap-3">
						<ContentFilterBar
							value={contentFilter}
							onChange={onChangeContentFilter}
						/>

						{/* Tag Filter */}
						<TagFilter selectedTags={selectedTags} onToggleTag={onToggleTag} />
					</div>

					{/* Completed-specific filters */}
					{activeView === "completed" && (
						<>
							<MobileViewTypeToggle
								value={completedViewType}
								onChange={onCompletedViewTypeChange}
							/>
							<MobileSortSelector
								value={completedSort}
								onChange={onCompletedSortChange}
							/>
						</>
					)}
				</MobileFilterSheet>

				{/* DESKTOP: Show filters inline */}
				<div className="hidden md:flex items-center gap-2">
					{activeView === "tasks" && (
						<BacklogDump onAddTasks={onAddTasks} selectedTags={selectedTags} />
					)}

					<ContentFilterBar
						value={contentFilter}
						onChange={onChangeContentFilter}
					/>

					<TagFilter selectedTags={selectedTags} onToggleTag={onToggleTag} />

					{activeView === "completed" && (
						<SortSelector
							value={completedSort}
							onChange={onCompletedSortChange}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
