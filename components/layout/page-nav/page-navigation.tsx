"use client";

import { ChevronLeft, ChevronRight, FunnelPlus } from "lucide-react";

interface PageNavigationProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	isFiltered?: boolean;
}

export function PageNavigation({
	currentPage,
	totalPages,
	onPageChange,
	isFiltered = false,
}: PageNavigationProps) {
	return (
		<div className="flex items-center gap-2">
			<button
				onClick={() => onPageChange(currentPage - 1)}
				disabled={currentPage <= 1}
				className="p-1 hover:bg-accent rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
				aria-label="Previous page"
			>
				<ChevronLeft className="w-4.5 h-4.5" />
			</button>
			<span className="text-sm text-muted-foreground flex items-center gap-2">
				{currentPage} of {totalPages}
				{isFiltered && (
					<FunnelPlus className="w-6 h-6 border border-transparent p-1" />
				)}
			</span>
			<button
				onClick={() => onPageChange(currentPage + 1)}
				disabled={currentPage >= totalPages}
				className="p-1 hover:bg-accent rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
				aria-label="Next page"
			>
				<ChevronRight className="w-4.5 h-4.5" />
			</button>
		</div>
	);
}
