// components/mobile-filters.tsx
"use client";

import { useState, useCallback } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	SheetFooter,
	SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

interface MobileFilterButtonProps {
	activeFilterCount: number;
	children: React.ReactNode;
	title?: string;
}

export function MobileFilterSheet({
	activeFilterCount,
	children,
	title = "Filters",
}: MobileFilterButtonProps) {
	const [open, setOpen] = useState(false);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 gap-2 md:hidden">
					<Filter className="w-4 h-4" />
					<span>Filters</span>
					{activeFilterCount > 0 && (
						<Badge
							variant="secondary"
							className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
						>
							{activeFilterCount}
						</Badge>
					)}
				</Button>
			</SheetTrigger>
			<SheetContent side="bottom" className="h-[85vh] md:hidden">
				<SheetHeader className="pb-4 border-b">
					<SheetTitle className="flex items-center justify-between">
						<span>{title}</span>
						<SheetClose asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<X className="w-4 h-4" />
							</Button>
						</SheetClose>
					</SheetTitle>
				</SheetHeader>
				<div className="py-6 space-y-6 overflow-y-auto">{children}</div>
				<SheetFooter className="pt-4 border-t">
					<SheetClose asChild>
						<Button className="w-full">Done</Button>
					</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

// Hook to calculate active filter count
export function useActiveFilterCount(
	selectedTags: Set<string>,
	contentFilter: { preset: string; options: string[] },
	completedSort?: string,
): number {
	let count = 0;
	if (selectedTags.size > 0) count++;
	if (contentFilter.preset !== "show-all") count++;
	if (completedSort && completedSort !== "default") count++;
	return count;
}
