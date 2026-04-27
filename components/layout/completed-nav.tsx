"use client";

import { useState, useRef, useEffect } from "react";
import {
	X,
	Search,
	PanelRightClose,
	PanelRightOpen,
	SlidersHorizontal,
	Clock,
	AlarmClock,
	ArrowDownUp,
	LayoutList,
	BookOpen,
	CalendarDays,
} from "lucide-react";
import type { CompletedSortKey, CompletedViewType } from "@/components/layout/view-tabs";
import type { ContentFilterState } from "@/lib/features/content-filter";
import type { TagId } from "@/lib/tags";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContentFilterBar } from "@/components/shared/content-filter-bar";
import { TagFilter } from "@/components/shared/tag-filter";

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

interface CompletedNavProps {
	completedSort: CompletedSortKey;
	onCompletedSortChange: (sort: CompletedSortKey) => void;
	completedViewType: CompletedViewType;
	onCompletedViewTypeChange: (type: CompletedViewType) => void;
	contentFilter: ContentFilterState;
	onChangeContentFilter: (filter: ContentFilterState) => void;
	buJoWidth: "narrow" | "full";
	onBuJoWidthChange: (width: "narrow" | "full") => void;
	completedSearch: string;
	onCompletedSearchChange: (search: string) => void;
	selectedTags: Set<TagId | "none">;
	onToggleTag: (tag: TagId | "none" | "all") => void;
}

export function CompletedNav({
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
	selectedTags,
	onToggleTag,
}: CompletedNavProps) {
	const [open, setOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const searchInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (searchOpen) {
			searchInputRef.current?.focus();
		} else {
			onCompletedSearchChange("");
		}
	}, [searchOpen]);

	// Calculate active filter count for badge
	const activeFilterCount =
		selectedTags.size +
		(contentFilter.preset !== "show-all" ? 1 : 0) +
		(completedSort !== "default" ? 1 : 0);

	return (
		<div className="flex md:flex items-center justify-between gap-2 px-4 py-2 border-b border-border">
			{/* Left side - Search bar */}
			{searchOpen ? (
				<div className="flex items-center gap-1 bg-secondary rounded-full px-3 py-1">
					<Search className="w-3 h-3 mr-1 text-muted-foreground shrink-0" />
					<input
						ref={searchInputRef}
						type="text"
						value={completedSearch}
						onChange={(e) => onCompletedSearchChange(e.target.value)}
						placeholder="Search completed..."
						className="bg-transparent py-1 border-none outline-none text-xs w-36 md:w-[500px] text-foreground placeholder:text-muted-foreground"
					/>
					{completedSearch && (
						<button
							onClick={() => onCompletedSearchChange("")}
							className="text-muted-foreground hover:text-foreground transition-colors"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					)}
					<button
						onClick={() => setSearchOpen(false)}
						className="text-muted-foreground hover:text-foreground transition-colors ml-1"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				</div>
			) : (
				<button
					onClick={() => setSearchOpen(true)}
					className="text-xs border border-border rounded-full p-1.75 transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
					title="Search completed tasks"
				>
					<Search className="w-4 h-4" />
				</button>
			)}

			{/* Right side - Controls */}
			<div className="flex items-center gap-2">

			{/* Narrow/Full width toggle - visible when bullet view is active */}
			{completedViewType === "bullet" && (
				<button
					onClick={() =>
						onBuJoWidthChange(buJoWidth === "full" ? "narrow" : "full")
					}
					className="flex px-2 py-1.5 rounded-md text-xs transition-all duration-200 text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100 h-8 items-center"
					title={buJoWidth === "full" ? "Narrow view" : "Full width"}
				>
					{buJoWidth === "full" ? (
						<PanelRightClose className="w-3.5 h-3.5" />
					) : (
						<PanelRightOpen className="w-3.5 h-3.5" />
					)}
				</button>
			)}

			{/* Preferences popover */}
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
			</div>
		</div>
	);
}
