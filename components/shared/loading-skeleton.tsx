import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/layout/header";

export function LoadingSkeleton() {
	return (
		<div className="h-screen overflow-hidden bg-background text-foreground flex flex-col">
			<Header />

			{/* Mobile only: Pamphlet Switcher Skeleton */}
			<div className="md:hidden px-4 py-2">
				<Skeleton className="h-10 w-full" />
			</div>

			{/* Mobile only: Timer Bar Skeleton */}
			<div className="md:hidden px-4 py-2">
				<Skeleton className="h-24 w-full" />
			</div>

			{/* View Tabs Skeleton */}
			<div className="px-4 py-2">
				<Skeleton className="h-12 w-full" />
			</div>

			<main className="flex-1 flex min-h-0">
				{/* Desktop: 2-column layout */}
				<div className="hidden md:flex flex-1 min-h-0">
					{/* Left Column: Task List */}
					<div className="w-1/2 flex flex-col min-h-0 border-r border-border">
						{/* Page Nav Skeleton */}
						<div className="px-4 py-3 border-b border-border">
							<Skeleton className="h-10 w-full" />
						</div>

						{/* Task List Skeleton */}
						<div className="flex-1 overflow-y-auto p-4 space-y-3">
							{[...Array(8)].map((_, i) => (
								<div key={i} className="space-y-2">
									<Skeleton className="h-16 w-full" />
								</div>
							))}
						</div>

						{/* Task Input Skeleton */}
						<div className="px-4 py-3 border-t border-border">
							<Skeleton className="h-12 w-full" />
						</div>
					</div>

					{/* Right Column: Timer Bar */}
					<div className="w-1/2 flex flex-col min-h-0">
						<div className="h-full border-b border-border p-6">
							<Skeleton className="h-full w-full" />
						</div>
					</div>
				</div>

				{/* Mobile: Single column */}
				<div className="md:hidden flex-1 flex flex-col min-h-0 w-full">
					{/* Page Nav Skeleton */}
					<div className="px-4 py-3 border-b border-border">
						<Skeleton className="h-10 w-full" />
					</div>

					{/* Task List Skeleton */}
					<div className="flex-1 overflow-y-auto p-4 space-y-3">
						{[...Array(6)].map((_, i) => (
							<div key={i} className="space-y-2">
								<Skeleton className="h-16 w-full" />
							</div>
						))}
					</div>
				</div>
			</main>

			{/* Mobile Task Input Skeleton */}
			<div className="md:hidden px-4 py-3 border-t border-border">
				<Skeleton className="h-12 w-full" />
			</div>
		</div>
	);
}
