"use client";

import { PageNavigation } from "./page-navigation";
import { StatsBar } from "./stats-bar";
import { ActionButtons } from "./action-buttons";
import { CompassButton } from "./compass-button";
import type { PageNavProps } from "./types";

export function PageNav({
	currentPage,
	totalPages,
	onPageChange,
	isFiltered = false,
	searchQuery,
	onSearchChange,
	totalActiveTasks,
	taskTagCounts,
	completedTasksWithNotes,
	onRefreshAchievements,
	pamphlets,
	habitsViewActive,
	onToggleHabitsView,
	activeHabitCount,
	selectedTags,
	onToggleTag,
	scheduleViewActive,
	onToggleScheduleView,
}: PageNavProps) {
	return (
		<div className="border-b border-border">
			{/* Desktop: single row */}
			<div className="flex flex-row sm:flex-row sm:items-center justify-between px-4 py-2 gap-1 sm:gap-0">
				{/* Left side — page nav + stats inline on desktop */}
				<div className="flex items-center justify-between gap-3">
					{/* Page navigation */}
					<PageNavigation
						currentPage={currentPage}
						totalPages={totalPages}
						onPageChange={onPageChange}
						isFiltered={isFiltered}
					/>

					{/* Stats — inline on desktop, hidden here on mobile (shown below) */}
					<StatsBar
						totalActiveTasks={totalActiveTasks}
						taskTagCounts={taskTagCounts}
						selectedTags={selectedTags}
						onToggleTag={onToggleTag}
					/>
				</div>

				{/* Right side — search + actions + compass */}
				<div className="flex items-center gap-2">
					<ActionButtons
						searchQuery={searchQuery}
						onSearchChange={onSearchChange}
						scheduleViewActive={scheduleViewActive}
						onToggleScheduleView={onToggleScheduleView}
						habitsViewActive={habitsViewActive}
						onToggleHabitsView={onToggleHabitsView}
						activeHabitCount={activeHabitCount}
					/>

					{/* Compass Button */}
					<CompassButton
						completedTasksWithNotes={completedTasksWithNotes}
						onRefreshAchievements={onRefreshAchievements}
						pamphlets={pamphlets}
					/>
				</div>
			</div>

			{/* Stats row — mobile only */}
			<StatsBar
				totalActiveTasks={totalActiveTasks}
				taskTagCounts={taskTagCounts}
				selectedTags={selectedTags}
				onToggleTag={onToggleTag}
				isMobile
			/>
		</div>
	);
}
