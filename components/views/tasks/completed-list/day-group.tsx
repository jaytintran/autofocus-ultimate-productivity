import React, { useCallback, memo } from "react";
import { Copy, CopyCheck, Trash2 } from "lucide-react";
import type { DayGroupProps, TimeBlockSectionProps, GroupedTasks } from "./types";
import type { Task } from "@/lib/types";
import type { TagId } from "@/lib/tags";
import { BulletRow } from "./bullet-row";
import { getTimePeriodBadgeStyle, getTimePeriodIconColor } from "./utils";
import { useCollapsedTimeBlocks } from "@/hooks/ui/use-collapsed-time-blocks";

export const TimeBlockSection = memo(function TimeBlockSection({
	timeBlock,
	loadingTaskId,
	loadingTagTaskId,
	showDeleteConfirm,
	onSelectTask,
	onRevertTask,
	onDeleteTask,
	onUpdateTag,
	blockKey,
	isCollapsed,
	onToggle,
}: TimeBlockSectionProps) {
	const Icon = timeBlock.icon;

	return (
		<div className="mb-3">
			<button
				type="button"
				onClick={() => onToggle(blockKey)}
				className={`inline-flex items-center gap-1.5 mb-1 border w-fit p-1 px-2 rounded-[5px] transition-opacity ${getTimePeriodBadgeStyle(timeBlock.period)} ${isCollapsed ? "opacity-50" : ""}`}
			>
				<Icon
					className={`w-3 h-3 ${getTimePeriodIconColor(timeBlock.period)}`}
				/>
				<span className="text-[10px] uppercase tracking-wider">
					{timeBlock.period}
				</span>
				{isCollapsed && (
					<span className="text-[10px] ml-1 opacity-60">
						({timeBlock.tasks.length})
					</span>
				)}
			</button>

			{!isCollapsed && (
				<div className="relative">
					{/* Vertical connecting line for BuJo aesthetic */}
					{timeBlock.tasks.length > 0 && (
						<div className="absolute left-[7px] top-0 bottom-0 w-[2px] bg-border/30" />
					)}

					<ul className="space-y-0 relative">
						{timeBlock.tasks.map((task) => (
							<BulletRow
								key={task.id}
								task={task}
								isLoading={task.id === loadingTaskId}
								loadingTagTaskId={loadingTagTaskId}
								showDeleteConfirm={showDeleteConfirm}
								onSelect={onSelectTask}
								onRevert={onRevertTask}
								onDelete={onDeleteTask}
								onUpdateTag={onUpdateTag}
							/>
						))}
					</ul>
				</div>
			)}
		</div>
	);
});

export const DayGroup = memo(function DayGroup({
	group,
	loadingTaskId,
	loadingTagTaskId,
	showDeleteConfirm,
	copiedDateKey,
	showDeleteDayConfirm,
	onSelectTask,
	onRevertTask,
	onDeleteTask,
	onUpdateTag,
	onExportDay,
	onDeleteDay,
}: DayGroupProps) {
	const handleExport = useCallback(() => {
		onExportDay(group);
	}, [onExportDay, group]);

	const handleDeleteDay = useCallback(() => {
		onDeleteDay(group.dateKey);
	}, [onDeleteDay, group.dateKey]);

	const { isCollapsed, toggle } = useCollapsedTimeBlocks();

	const isDeleteDayConfirm = showDeleteDayConfirm === group.dateKey;

	return (
		<div className="mb-6">
			<div className="flex items-center gap-3 mb-4">
				<span className="text-xs font-semibold tracking-widest uppercase text-foreground">
					{group.dateLabel}
				</span>
				<div className="flex-1 h-px bg-border/50" />
				<button
					type="button"
					onClick={handleDeleteDay}
					className={`flex items-center gap-1 transition-colors ${
						isDeleteDayConfirm
							? "text-red-500 hover:text-red-600"
							: "text-muted-foreground/40 hover:text-muted-foreground"
					}`}
					title={isDeleteDayConfirm ? "Click again to confirm deletion" : "Delete entire day"}
				>
					<Trash2 className="w-4 h-4" />
				</button>
				<button
					type="button"
					onClick={handleExport}
					className="flex items-center gap-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
					title="Copy day as markdown"
				>
					{copiedDateKey === group.dateKey ? (
						<CopyCheck className="w-4 h-4 text-[#8b9a6b]" />
					) : (
						<Copy className="w-4 h-4" />
					)}
				</button>
			</div>

			{group.timeBlocks.map((timeBlock) => {
				const blockKey = `${timeBlock.period}-${group.dateKey}`;
				return (
					<TimeBlockSection
						key={timeBlock.period}
						timeBlock={timeBlock}
						loadingTaskId={loadingTaskId}
						loadingTagTaskId={loadingTagTaskId}
						showDeleteConfirm={showDeleteConfirm}
						onSelectTask={onSelectTask}
						onRevertTask={onRevertTask}
						onDeleteTask={onDeleteTask}
						onUpdateTag={onUpdateTag}
						blockKey={blockKey}
						isCollapsed={isCollapsed(blockKey)}
						onToggle={toggle}
					/>
				);
			})}
		</div>
	);
});

export const BulletJournalView = memo(function BulletJournalView({
	groupedTasks,
	loadingTaskId,
	loadingTagTaskId,
	showDeleteConfirm,
	copiedDateKey,
	showDeleteDayConfirm,
	hasMore,
	isLoadingMore,
	onSelectTask,
	onRevertTask,
	onDeleteTask,
	onUpdateTag,
	onLoadMore,
	onExportDay,
	onDeleteDay,
	buJoWidth,
}: {
	groupedTasks: GroupedTasks[];
	loadingTaskId: string | null;
	loadingTagTaskId: string | null;
	showDeleteConfirm: string | null;
	copiedDateKey: string | null;
	showDeleteDayConfirm: string | null;
	hasMore: boolean;
	isLoadingMore: boolean;
	onSelectTask: (id: string) => void;
	onRevertTask: (task: Task) => void;
	onDeleteTask: (id: string) => void;
	onUpdateTag: (taskId: string, tag: TagId | null) => void;
	onLoadMore: () => void;
	onExportDay: (group: GroupedTasks) => void;
	onDeleteDay: (dateKey: string) => void;
	buJoWidth: string | null;
}) {
	const handleLoadMore = useCallback(() => {
		onLoadMore();
	}, [onLoadMore]);

	if (groupedTasks.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center text-center py-16">
				<p className="text-muted-foreground font-medium">No entries yet.</p>
				<p className="text-muted-foreground text-sm mt-1">
					Complete tasks or log an activity below.
				</p>
			</div>
		);
	}

	return (
		<div
			className={`${buJoWidth === "narrow" ? "max-w-2xl mx-auto w-full" : ""}flex-1 overflow-y-auto px-5 py-2 !scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent custom-scrollbar`}
			style={{
				scrollbarWidth: "thin",
				scrollbarColor: "hsl(var(--border)) transparent",
			}}
		>
			{groupedTasks.map((group) => (
				<DayGroup
					key={group.dateKey}
					group={group}
					loadingTaskId={loadingTaskId}
					loadingTagTaskId={loadingTagTaskId}
					showDeleteConfirm={showDeleteConfirm}
					copiedDateKey={copiedDateKey}
					showDeleteDayConfirm={showDeleteDayConfirm}
					onSelectTask={onSelectTask}
					onRevertTask={onRevertTask}
					onDeleteTask={onDeleteTask}
					onUpdateTag={onUpdateTag}
					onExportDay={onExportDay}
					onDeleteDay={onDeleteDay}
				/>
			))}

			{hasMore && (
				<div className="flex justify-center py-4">
					<button
						type="button"
						onClick={handleLoadMore}
						disabled={isLoadingMore}
						className="px-4 py-2 text-sm border border-border rounded-full hover:bg-accent transition-colors disabled:opacity-50 text-muted-foreground"
					>
						{isLoadingMore ? "Loading..." : "Load more"}
					</button>
				</div>
			)}
		</div>
	);
});
