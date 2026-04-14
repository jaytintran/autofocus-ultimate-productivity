import React, { memo } from "react";
import { Check, X } from "lucide-react";
import type { GroupedTasks } from "./types";
import type { TagId } from "@/lib/tags";
import { TagPill } from "@/components/shared/tag-pill";
import { formatCompletionTime, getTimePeriodColor, getTimePeriodIconColor } from "./utils";
import { formatTimeCompact } from "@/lib/utils/time-utils";

export const DefaultView = memo(function DefaultView({
	groupedTasks,
	loadingTaskId,
	loadingTagTaskId,
	showDeleteConfirm,
	hasMore,
	isLoadingMore,
	onSelectTask,
	onUpdateTag,
	onLoadMore,
}: {
	groupedTasks: GroupedTasks[];
	loadingTaskId: string | null;
	loadingTagTaskId: string | null;
	showDeleteConfirm: string | null;
	hasMore: boolean;
	isLoadingMore: boolean;
	onSelectTask: (id: string) => void;
	onUpdateTag: (taskId: string, tag: TagId | null) => void;
	onLoadMore: () => void;
}) {
	return (
		<>
			{groupedTasks.map((group) => (
				<div key={group.dateKey} className="mb-4">
					<div className="px-4 py-2 bg-secondary/50 border-b border-border sticky top-0 z-10">
						<span className="text-sm text-muted-foreground font-medium">
							{group.dateLabel}
						</span>
					</div>
					{group.timeBlocks.map((timeBlock) => {
						const Icon = timeBlock.icon;
						return (
							<div
								key={timeBlock.period}
								className={`flex gap-3 ${getTimePeriodColor(timeBlock.period)} py-2 px-3`}
							>
								<div className="flex items-center">
									<Icon
										className={`w-4 h-4 ${getTimePeriodIconColor(timeBlock.period)}`}
									/>
								</div>
								<div className="flex-1 min-w-0">
									<ul className="divide-y divide-border/50">
										{timeBlock.tasks.map((task) => {
											const isLoading = task.id === loadingTaskId;
											return (
												<li
													key={task.id}
													className={`flex items-center gap-3 py-2 cursor-pointer ${isLoading ? "opacity-50" : ""}`}
													onClick={() => onSelectTask(task.id)}
												>
													{task.source === "log" ? (
														<span className="text-muted-foreground/50 font-mono text-base leading-none flex-shrink-0">
															•
														</span>
													) : task.note ? (
														<X className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
													) : (
														<Check className="w-3.5 h-3.5 text-[#8b9a6b] flex-shrink-0" />
													)}
													<span
														className={`flex-1 min-w-0 truncate text-sm ${
															task.source === "log"
																? "text-foreground"
																: "text-muted-foreground line-through"
														}`}
													>
														{task.text}
													</span>
													{task.tag && (
														<TagPill
															tagId={task.tag}
															onSelectTag={(tag) => onUpdateTag(task.id, tag)}
															disabled={
																loadingTagTaskId === task.id || isLoading
															}
															className="scale-90 origin-right flex-shrink-0"
														/>
													)}
													{task.total_time_ms > 0 && (
														<span className="text-xs text-[#8b9a6b] flex-shrink-0">
															{formatTimeCompact(task.total_time_ms)}
														</span>
													)}
													{task.completed_at && (
														<span className="text-xs text-muted-foreground/60 flex-shrink-0 font-mono">
															{formatCompletionTime(task.completed_at)}
														</span>
													)}
												</li>
											);
										})}
									</ul>
								</div>
							</div>
						);
					})}
				</div>
			))}
			{hasMore && (
				<div className="flex justify-center py-6">
					<button
						type="button"
						onClick={onLoadMore}
						disabled={isLoadingMore}
						className="px-4 py-2 text-sm border border-border rounded-full hover:bg-accent transition-colors disabled:opacity-50 text-muted-foreground"
					>
						{isLoadingMore ? "Loading..." : "Load more"}
					</button>
				</div>
			)}
			{!hasMore && groupedTasks.length > 0 && (
				<div className="flex justify-center py-6">
					<p className="text-xs text-muted-foreground">
						All completed tasks loaded 🎉
					</p>
				</div>
			)}
		</>
	);
});
