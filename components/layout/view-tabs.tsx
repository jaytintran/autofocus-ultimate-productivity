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
	PanelRightClose,
	PanelRightOpen,
	Calendar,
	X,
	Search,
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
import { TagFilter } from "@/components/shared/tag-filter";
import { BacklogDump } from "@/components/shared/backlog-dump";
import { ContentFilterBar } from "@/components/shared/content-filter-bar";
import { PamphletDropdown } from "@/components/layout/pamphlet-dropdown";
import type { TagId } from "@/lib/tags";
import type { ContentFilterState } from "@/lib/features/content-filter";
import type { Pamphlet } from "@/lib/types";

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
	buJoWidth: "full" | "narrow";
	onBuJoWidthChange: (w: "full" | "narrow") => void;
}

function ViewTypeToggle({
	value,
	onChange,
	buJoWidth,
	onBuJoWidthChange,
}: ViewTypeToggleProps) {
	return (
		<div className="hidden sm:inline-flex gap-1 bg-muted/30 rounded-lg p-1">
			<button
				onClick={() => onChange("bullet")}
				className={`
					px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
					flex items-center gap-1.5
					${
						value === "bullet"
							? "bg-af4-olive text-background shadow-sm scale-105"
							: "text-muted-foreground hover:text-foreground opacity-60"
					}
				`}
				title="Bullet Journal View"
			>
				<BookOpen className="w-3.5 h-3.5" />
				<span className="hidden lg:inline">Bullet</span>
			</button>
			<button
				onClick={() => onChange("default")}
				className={`
					px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
					flex items-center gap-1.5
					${
						value === "default"
							? "bg-af4-olive text-background shadow-sm scale-105"
							: "text-muted-foreground hover:text-foreground opacity-60"
					}
				`}
				title="Linear View"
			>
				<LayoutList className="w-3.5 h-3.5" />
				<span className="hidden lg:inline">List</span>
			</button>
			<button
				onClick={() => onChange("7days")}
				className={`
					px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
					flex items-center gap-1.5
					${
						value === "7days"
							? "bg-af4-olive text-background shadow-sm scale-105"
							: "text-muted-foreground hover:text-foreground opacity-60"
					}
				`}
				title="7 Days View"
			>
				<CalendarDays className="w-3.5 h-3.5" />
				<span className="hidden lg:inline">7 Days</span>
			</button>

			{value === "bullet" && (
				<button
					onClick={() =>
						onBuJoWidthChange(buJoWidth === "full" ? "narrow" : "full")
					}
					className="px-2 py-1.5 rounded-md text-xs transition-all duration-200 text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100 ml-1 border-l border-border/50 pl-3"
					title={buJoWidth === "full" ? "Narrow view" : "Full width"}
				>
					{buJoWidth === "full" ? (
						<PanelRightClose className="w-3.5 h-3.5" />
					) : (
						<PanelRightOpen className="w-3.5 h-3.5" />
					)}
				</button>
			)}
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
// DESKTOP PREFERENCES POPOVER (Completed View)
// =============================================================================

interface DesktopPreferencesPopoverProps {
	activeFilterCount: number;
	completedSort: CompletedSortKey;
	onCompletedSortChange: (sort: CompletedSortKey) => void;
	completedViewType: CompletedViewType;
	onCompletedViewTypeChange: (view: CompletedViewType) => void;
	contentFilter: ContentFilterState;
	onChangeContentFilter: (filter: ContentFilterState) => void;
	selectedTags: Set<TagId | "none">;
	onToggleTag: (tag: TagId | "none" | "all") => void;
}

function DesktopPreferencesPopover({
	activeFilterCount,
	completedSort,
	onCompletedSortChange,
	completedViewType,
	onCompletedViewTypeChange,
	contentFilter,
	onChangeContentFilter,
	selectedTags,
	onToggleTag,
}: DesktopPreferencesPopoverProps) {
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="h-8 gap-2 relative"
				>
					<SlidersHorizontal className="w-4 h-4" />
					<span>Preferences</span>
					{activeFilterCount > 0 && (
						<Badge
							variant="secondary"
							className="absolute -top-2 -right-2 h-3.5 w-3.5 p-0 flex items-center justify-center text-xs bg-[#8b9a6b] text-white border-0"
						>
							{activeFilterCount}
						</Badge>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-4" align="end">
				<div className="space-y-6">
					{/* View Type Section */}
					<div className="space-y-3">
						<h4 className="text-sm font-medium text-muted-foreground">View Style</h4>
						<div className="grid grid-cols-3 gap-2">
							{[
								{ key: "bullet" as const, label: "Bullet", icon: BookOpen },
								{ key: "default" as const, label: "List", icon: LayoutList },
								{ key: "7days" as const, label: "7 Days", icon: CalendarDays },
							].map((option) => {
								const Icon = option.icon;
								return (
									<button
										key={option.key}
										onClick={() => onCompletedViewTypeChange(option.key)}
										className={`flex flex-col items-center gap-1 px-2 py-2 text-xs rounded-lg border transition-all ${
											completedViewType === option.key
												? "border-[#8b9a6b] bg-[#8b9a6b]/10 text-foreground"
												: "border-border hover:border-foreground/30 text-muted-foreground"
										}`}
									>
										<Icon className="w-4 h-4" />
										<span className="font-medium">{option.label}</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* Sort Section */}
					<div className="space-y-3">
						<h4 className="text-sm font-medium text-muted-foreground">Sort Order</h4>
						<div className="grid grid-cols-2 gap-2">
							{SORT_OPTIONS.map((option) => {
								const Icon = option.icon;
								return (
									<button
										key={option.key}
										onClick={() => onCompletedSortChange(option.key)}
										className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${
											completedSort === option.key
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

					{/* Content Filter and Tags on same row */}
					<div className="flex flex-row gap-3">
						<ContentFilterBar
							value={contentFilter}
							onChange={onChangeContentFilter}
						/>
						<TagFilter selectedTags={selectedTags} onToggleTag={onToggleTag} />
					</div>
				</div>
			</PopoverContent>
		</Popover>
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
		<div className="inline-flex gap-1 bg-muted/30 rounded-lg p-1 w-fit">
			<button
				onClick={() => onChange("tasks")}
				className={`
					px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
					flex items-center gap-1.5
					${
						activeView === "tasks"
							? "bg-af4-olive text-background shadow-sm scale-105"
							: "text-muted-foreground hover:text-foreground opacity-60"
					}
				`}
			>
				<span className="hidden sm:inline">Tasks</span>
				<Square className="w-3.5 h-3.5 sm:hidden" />
			</button>
			<button
				onClick={() => onChange("completed")}
				className={`
					px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
					flex items-center gap-1.5
					${
						activeView === "completed"
							? "bg-af4-olive text-background shadow-sm scale-105"
							: "text-muted-foreground hover:text-foreground opacity-60"
					}
				`}
			>
				<span className="hidden sm:inline">Completed</span>
				<SquareCheck className="w-3.5 h-3.5 sm:hidden" />
			</button>
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
	buJoWidth: "full" | "narrow";
	onBuJoWidthChange: (w: "full" | "narrow") => void;
	completedSearch: string;
	onCompletedSearchChange: (q: string) => void;
	pamphlets: Pamphlet[];
	activePamphlet: Pamphlet | null;
	onSwitchPamphlet: (id: string) => void;
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
	buJoWidth,
	onBuJoWidthChange,
	completedSearch,
	onCompletedSearchChange,
	pamphlets,
	activePamphlet,
	onSwitchPamphlet,
}: ViewTabsProps) {
	// Calculate active filter count for badge
	const activeFilterCount =
		selectedTags.size +
		(contentFilter.preset !== "show-all" ? 1 : 0) +
		(activeView === "completed" && completedSort !== "default" ? 1 : 0);

	return (
		<div className="relative flex flex-row flex-wrap gap-2 justify-between items-center px-4 py-3">
			{/* Left side - Pamphlet dropdown (desktop only) + Main view toggle */}
			<div className="flex gap-2 flex-wrap items-center">
				<div className="hidden md:block">
					<PamphletDropdown
						pamphlets={pamphlets}
						activePamphlet={activePamphlet}
						onSwitch={onSwitchPamphlet}
					/>
				</div>
				<MainViewToggle activeView={activeView} onChange={onViewChange} />
			</div>

			{/* Right side - Filters */}
			<div className="flex items-center gap-2">
				{/* Tasks-specific: Backlog Dump */}
				{activeView === "tasks" && (
					<div className="space-y-3 md:hidden">
						<BacklogDump onAddTasks={onAddTasks} selectedTags={selectedTags} />
					</div>
				)}

				{/* Search bar — completed view only, positioned right */}
				{activeView === "completed" && (
					<div className="flex items-center gap-1 bg-muted/30 rounded-lg px-3 py-4 h-8 border border-transparent focus-within:border-border transition-colors">
						<Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
						<input
							type="text"
							value={completedSearch}
							onChange={(e) => onCompletedSearchChange(e.target.value)}
							placeholder="Search completed..."
							className="bg-transparent border-none outline-none text-xs w-56 max-sm:w-40 text-foreground placeholder:text-muted-foreground"
						/>
						{completedSearch && (
							<button
								onClick={() => onCompletedSearchChange("")}
								className="text-muted-foreground hover:text-foreground transition-colors"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						)}
					</div>
				)}

				{/* Narrow/Full width toggle - visible on desktop when bullet view is active */}
				{activeView === "completed" && completedViewType === "bullet" && (
					<button
						onClick={() =>
							onBuJoWidthChange(buJoWidth === "full" ? "narrow" : "full")
						}
						className="hidden md:flex px-2 py-1.5 rounded-md text-xs transition-all duration-200 text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100 h-8 items-center"
						title={buJoWidth === "full" ? "Narrow view" : "Full width"}
					>
						{buJoWidth === "full" ? (
							<PanelRightClose className="w-3.5 h-3.5" />
						) : (
							<PanelRightOpen className="w-3.5 h-3.5" />
						)}
					</button>
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
								buJoWidth={"full"}
								onBuJoWidthChange={onBuJoWidthChange}
							/>
							<MobileSortSelector
								value={completedSort}
								onChange={onCompletedSortChange}
							/>
						</>
					)}
				</MobileFilterSheet>

				{/* DESKTOP: Show filters inline for tasks, preferences popover for completed */}
				<div className="hidden md:flex items-center gap-2">
					{activeView === "tasks" && (
						<>
							<BacklogDump onAddTasks={onAddTasks} selectedTags={selectedTags} />
							<ContentFilterBar
								value={contentFilter}
								onChange={onChangeContentFilter}
							/>
						</>
					)}

					{activeView === "completed" && (
						<DesktopPreferencesPopover
							activeFilterCount={activeFilterCount}
							completedSort={completedSort}
							onCompletedSortChange={onCompletedSortChange}
							completedViewType={completedViewType}
							onCompletedViewTypeChange={onCompletedViewTypeChange}
							contentFilter={contentFilter}
							onChangeContentFilter={onChangeContentFilter}
							selectedTags={selectedTags}
							onToggleTag={onToggleTag}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
