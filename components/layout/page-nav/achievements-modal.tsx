"use client";

import { useState, useMemo } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
	RefreshCw,
	Search,
	X,
	Download,
	CheckCircle2,
	FileText,
	Clock,
	Calendar,
	Filter,
	SortAsc,
	SortDesc,
	Layers,
} from "lucide-react";
import { TAG_DEFINITIONS, type TagId } from "@/lib/tags";
import { PAMPHLET_COLORS } from "@/lib/features/pamphlet-colors";
import { formatTimeCompact } from "@/lib/utils/time-utils";
import type {
	CompletedTaskWithNote,
	AchievementFilters,
	AchievementFilterType,
	AchievementSortKey,
	AchievementGroupBy,
} from "./types";
import type { Pamphlet } from "@/lib/types";

interface AchievementsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	completedTasksWithNotes: CompletedTaskWithNote[];
	onRefresh: () => void;
	pamphlets: Pamphlet[];
}

export function AchievementsModal({
	open,
	onOpenChange,
	completedTasksWithNotes,
	onRefresh,
	pamphlets,
}: AchievementsModalProps) {
	const [filters, setFilters] = useState<AchievementFilters>({
		type: "all",
		search: "",
		pamphletId: null,
		tagId: null,
		dateRange: "all",
		minTimeMs: 0,
		sortBy: "date_desc",
		groupBy: "date",
	});

	const [showFilters, setShowFilters] = useState(false);

	// Filter and sort achievements
	const filteredAchievements = useMemo(() => {
		let results = completedTasksWithNotes.filter((task) => {
			// Filter out bullet points from notes
			const hasAchievementNote = task.note
				.split("\n")
				.some((line) => line.trim() && !line.startsWith("•"));
			if (!hasAchievementNote) return false;

			// Type filter
			if (filters.type === "tasks" && task.source === "log") return false;
			if (filters.type === "logs" && task.source !== "log") return false;

			// Search filter
			if (filters.search.trim()) {
				const q = filters.search.toLowerCase();
				const matchesText = task.text.toLowerCase().includes(q);
				const matchesNote = task.note.toLowerCase().includes(q);
				if (!matchesText && !matchesNote) return false;
			}

			// Pamphlet filter
			if (filters.pamphletId && task.pamphlet_id !== filters.pamphletId) {
				return false;
			}

			// Tag filter
			if (filters.tagId !== null) {
				if (filters.tagId === "none" && task.tag !== null) return false;
				if (filters.tagId !== "none" && task.tag !== filters.tagId) return false;
			}

			// Date range filter
			if (filters.dateRange !== "all") {
				const taskDate = new Date(task.completed_at);
				const now = new Date();
				const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

				switch (filters.dateRange) {
					case "today":
						if (taskDate < today) return false;
						break;
					case "week":
						const weekAgo = new Date(today);
						weekAgo.setDate(weekAgo.getDate() - 7);
						if (taskDate < weekAgo) return false;
						break;
					case "month":
						const monthAgo = new Date(today);
						monthAgo.setMonth(monthAgo.getMonth() - 1);
						if (taskDate < monthAgo) return false;
						break;
				}
			}

			// Min time filter
			if (filters.minTimeMs > 0 && task.total_time_ms < filters.minTimeMs) {
				return false;
			}

			return true;
		});

		// Sort
		results.sort((a, b) => {
			switch (filters.sortBy) {
				case "date_desc":
					return (
						new Date(b.completed_at).getTime() -
						new Date(a.completed_at).getTime()
					);
				case "date_asc":
					return (
						new Date(a.completed_at).getTime() -
						new Date(b.completed_at).getTime()
					);
				case "time_desc":
					return b.total_time_ms - a.total_time_ms;
				case "time_asc":
					return a.total_time_ms - b.total_time_ms;
				default:
					return 0;
			}
		});

		return results;
	}, [completedTasksWithNotes, filters]);

	// Group achievements
	const groupedAchievements = useMemo(() => {
		if (filters.groupBy === "none") {
			return [{ key: "all", label: "All Achievements", items: filteredAchievements }];
		}

		const groups = new Map<string, CompletedTaskWithNote[]>();

		filteredAchievements.forEach((task) => {
			let key: string;
			let label: string;

			switch (filters.groupBy) {
				case "date": {
					const date = new Date(task.completed_at);
					const now = new Date();
					const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
					const taskDate = new Date(
						date.getFullYear(),
						date.getMonth(),
						date.getDate()
					);
					const diffDays = Math.floor(
						(today.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24)
					);

					if (diffDays === 0) {
						key = "today";
						label = "Today";
					} else if (diffDays === 1) {
						key = "yesterday";
						label = "Yesterday";
					} else if (diffDays < 7) {
						key = `${diffDays}days`;
						label = `${diffDays} days ago`;
					} else {
						key = date.toISOString().split("T")[0];
						label = date.toLocaleDateString(undefined, {
							year: "numeric",
							month: "short",
							day: "numeric",
						});
					}
					break;
				}
				case "pamphlet": {
					const pamphlet = pamphlets.find((p) => p.id === task.pamphlet_id);
					key = task.pamphlet_id || "none";
					label = pamphlet?.name || "No Pamphlet";
					break;
				}
				case "tag": {
					const tag = TAG_DEFINITIONS.find((t) => t.id === task.tag);
					key = task.tag || "none";
					label = tag ? `${tag.emoji} ${tag.label}` : "No Tag";
					break;
				}
				default:
					key = "all";
					label = "All";
			}

			if (!groups.has(key)) {
				groups.set(key, []);
			}
			groups.get(key)!.push(task);
		});

		return Array.from(groups.entries()).map(([key, items]) => ({
			key,
			label: items[0]
				? filters.groupBy === "date"
					? (() => {
							const date = new Date(items[0].completed_at);
							const now = new Date();
							const today = new Date(
								now.getFullYear(),
								now.getMonth(),
								now.getDate()
							);
							const taskDate = new Date(
								date.getFullYear(),
								date.getMonth(),
								date.getDate()
							);
							const diffDays = Math.floor(
								(today.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24)
							);

							if (diffDays === 0) return "Today";
							if (diffDays === 1) return "Yesterday";
							if (diffDays < 7) return `${diffDays} days ago`;
							return date.toLocaleDateString(undefined, {
								year: "numeric",
								month: "short",
								day: "numeric",
							});
						})()
					: filters.groupBy === "pamphlet"
						? pamphlets.find((p) => p.id === items[0].pamphlet_id)?.name ||
							"No Pamphlet"
						: filters.groupBy === "tag"
							? TAG_DEFINITIONS.find((t) => t.id === items[0].tag)
								? `${TAG_DEFINITIONS.find((t) => t.id === items[0].tag)!.emoji} ${TAG_DEFINITIONS.find((t) => t.id === items[0].tag)!.label}`
								: "No Tag"
							: "All"
				: "Unknown",
			items,
		}));
	}, [filteredAchievements, filters.groupBy, pamphlets]);

	const handleExport = () => {
		const markdown = filteredAchievements
			.map((task) => {
				const date = new Date(task.completed_at);
				const pamphlet = pamphlets.find((p) => p.id === task.pamphlet_id);
				const tag = TAG_DEFINITIONS.find((t) => t.id === task.tag);
				const timeTracked =
					task.total_time_ms > 0 ? formatTimeCompact(task.total_time_ms) : "";

				const notes = task.note
					.split("\n")
					.filter((line) => line.trim() && !line.startsWith("•"))
					.join("\n");

				return `## ${task.text}

${notes}

**Date:** ${date.toLocaleDateString()} ${date.toLocaleTimeString()}
${pamphlet ? `**Pamphlet:** ${pamphlet.name}` : ""}
${tag ? `**Tag:** ${tag.emoji} ${tag.label}` : ""}
${timeTracked ? `**Time Tracked:** ${timeTracked}` : ""}

---
`;
			})
			.join("\n");

		const blob = new Blob([markdown], { type: "text/markdown" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `achievements-${new Date().toISOString().split("T")[0]}.md`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const activeFilterCount = [
		filters.type !== "all",
		filters.search.trim(),
		filters.pamphletId,
		filters.tagId !== null,
		filters.dateRange !== "all",
		filters.minTimeMs > 0,
	].filter(Boolean).length;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[900px] h-[85vh] flex flex-col overflow-hidden">
				<DialogHeader className="flex-shrink-0 border-b pb-4">
					<DialogTitle className="flex items-center gap-2">
						Your Achievements 🏆
					</DialogTitle>
					<DialogDescription>
						{filteredAchievements.length} achievement
						{filteredAchievements.length !== 1 ? "s" : ""} found. Be proud of what
						you've accomplished.
					</DialogDescription>
				</DialogHeader>

				{/* Action buttons */}
				<div className="flex items-center gap-2 flex-shrink-0">
					<Button
						variant="outline"
						size="sm"
						onClick={onRefresh}
						className="gap-2"
					>
						<RefreshCw className="w-3.5 h-3.5" />
						Refresh
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowFilters(!showFilters)}
						className="gap-2"
					>
						<Filter className="w-3.5 h-3.5" />
						Filters
						{activeFilterCount > 0 && (
							<span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-bold">
								{activeFilterCount}
							</span>
						)}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleExport}
						className="gap-2"
						disabled={filteredAchievements.length === 0}
					>
						<Download className="w-3.5 h-3.5" />
						Export
					</Button>
				</div>

				{/* Filters panel */}
				{showFilters && (
					<div className="flex-shrink-0 border rounded-lg p-4 space-y-3 bg-secondary/20">
						{/* Type filter */}
						<div className="flex items-center gap-2">
							<span className="text-xs text-muted-foreground w-20">Type:</span>
							<div className="flex gap-1">
								{(["all", "tasks", "logs"] as AchievementFilterType[]).map(
									(type) => (
										<Button
											key={type}
											variant={filters.type === type ? "default" : "outline"}
											size="sm"
											onClick={() => setFilters({ ...filters, type })}
											className="text-xs h-7"
										>
											{type === "all"
												? "All"
												: type === "tasks"
													? "Tasks"
													: "Logs"}
										</Button>
									)
								)}
							</div>
						</div>

						{/* Search */}
						<div className="flex items-center gap-2">
							<span className="text-xs text-muted-foreground w-20">Search:</span>
							<div className="flex-1 relative">
								<Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
								<input
									type="text"
									value={filters.search}
									onChange={(e) =>
										setFilters({ ...filters, search: e.target.value })
									}
									placeholder="Search achievements..."
									className="w-full pl-8 pr-8 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
								/>
								{filters.search && (
									<button
										onClick={() => setFilters({ ...filters, search: "" })}
										className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									>
										<X className="w-3.5 h-3.5" />
									</button>
								)}
							</div>
						</div>

						{/* Pamphlet filter */}
						<div className="flex items-center gap-2">
							<span className="text-xs text-muted-foreground w-20">
								Pamphlet:
							</span>
							<select
								value={filters.pamphletId || ""}
								onChange={(e) =>
									setFilters({
										...filters,
										pamphletId: e.target.value || null,
									})
								}
								className="flex-1 px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
							>
								<option value="">All Pamphlets</option>
								{pamphlets.map((p) => (
									<option key={p.id} value={p.id}>
										{p.name}
									</option>
								))}
							</select>
						</div>

						{/* Tag filter */}
						<div className="flex items-center gap-2">
							<span className="text-xs text-muted-foreground w-20">Tag:</span>
							<select
								value={filters.tagId || ""}
								onChange={(e) =>
									setFilters({
										...filters,
										tagId: (e.target.value as TagId | "none") || null,
									})
								}
								className="flex-1 px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
							>
								<option value="">All Tags</option>
								<option value="none">No Tag</option>
								{TAG_DEFINITIONS.map((tag) => (
									<option key={tag.id} value={tag.id}>
										{tag.emoji} {tag.label}
									</option>
								))}
							</select>
						</div>

						{/* Date range filter */}
						<div className="flex items-center gap-2">
							<span className="text-xs text-muted-foreground w-20">Date:</span>
							<div className="flex gap-1">
								{(["all", "today", "week", "month"] as const).map((range) => (
									<Button
										key={range}
										variant={
											filters.dateRange === range ? "default" : "outline"
										}
										size="sm"
										onClick={() => setFilters({ ...filters, dateRange: range })}
										className="text-xs h-7"
									>
										{range === "all"
											? "All"
											: range === "today"
												? "Today"
												: range === "week"
													? "Week"
													: "Month"}
									</Button>
								))}
							</div>
						</div>

						{/* Min time filter */}
						<div className="flex items-center gap-2">
							<span className="text-xs text-muted-foreground w-20">
								Min Time:
							</span>
							<div className="flex gap-1">
								{[
									{ label: "Any", value: 0 },
									{ label: "30m+", value: 30 * 60 * 1000 },
									{ label: "1h+", value: 60 * 60 * 1000 },
									{ label: "2h+", value: 2 * 60 * 60 * 1000 },
								].map((option) => (
									<Button
										key={option.value}
										variant={
											filters.minTimeMs === option.value ? "default" : "outline"
										}
										size="sm"
										onClick={() =>
											setFilters({ ...filters, minTimeMs: option.value })
										}
										className="text-xs h-7"
									>
										{option.label}
									</Button>
								))}
							</div>
						</div>

						{/* Sort and Group */}
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2 flex-1">
								<span className="text-xs text-muted-foreground w-20">Sort:</span>
								<select
									value={filters.sortBy}
									onChange={(e) =>
										setFilters({
											...filters,
											sortBy: e.target.value as AchievementSortKey,
										})
									}
									className="flex-1 px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
								>
									<option value="date_desc">Newest First</option>
									<option value="date_asc">Oldest First</option>
									<option value="time_desc">Most Time</option>
									<option value="time_asc">Least Time</option>
								</select>
							</div>
							<div className="flex items-center gap-2 flex-1">
								<span className="text-xs text-muted-foreground w-20">Group:</span>
								<select
									value={filters.groupBy}
									onChange={(e) =>
										setFilters({
											...filters,
											groupBy: e.target.value as AchievementGroupBy,
										})
									}
									className="flex-1 px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
								>
									<option value="date">By Date</option>
									<option value="pamphlet">By Pamphlet</option>
									<option value="tag">By Tag</option>
									<option value="none">No Grouping</option>
								</select>
							</div>
						</div>
					</div>
				)}

				{/* Achievements list */}
				<div
					className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-4"
					style={{ scrollbarWidth: "thin" }}
				>
					{filteredAchievements.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-8">
							No achievements found. Try adjusting your filters.
						</p>
					) : (
						groupedAchievements.map((group) => (
							<div key={group.key} className="flex flex-col gap-2">
								{filters.groupBy !== "none" && (
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background py-1 z-10">
										{group.label} ({group.items.length})
									</h3>
								)}
								{group.items.map((task, i) => {
									const date = new Date(task.completed_at);
									const pamphlet = pamphlets.find(
										(p) => p.id === task.pamphlet_id
									);
									const tag = TAG_DEFINITIONS.find((t) => t.id === task.tag);
									const isLog = task.source === "log";

									return (
										<div
											key={`${task.completed_at}-${i}`}
											className="flex flex-col gap-1 py-3 px-3 border border-border/50 rounded-lg hover:bg-accent/50 transition-colors"
										>
											{/* Achievement note */}
											<div className="flex flex-col gap-0.5">
												{task.note
													.split("\n")
													.filter((line) => line.trim() && !line.startsWith("•"))
													.map((line, i) => (
														<p
															key={i}
															className="text-sm font-medium text-foreground leading-snug"
														>
															{line}
														</p>
													))}
											</div>

											{/* Original task */}
											<p className="text-[11px] text-muted-foreground">
												<span className="underline">From the task</span>:{" "}
												{task.text}
											</p>

											{/* Metadata */}
											<div className="flex items-center gap-2 mt-1 flex-wrap">
												{/* Type icon */}
												{isLog ? (
													<div className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
														<FileText className="w-3 h-3" />
														<span>Log</span>
													</div>
												) : (
													<div className="flex items-center gap-1 text-[11px] text-[#8b9a6b]">
														<CheckCircle2 className="w-3 h-3" />
														<span>Task</span>
													</div>
												)}

												{/* Date */}
												<div className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
													<Calendar className="w-3 h-3" />
													<span>
														{date.toLocaleDateString(undefined, {
															month: "short",
															day: "numeric",
														})}{" "}
														{date.toLocaleTimeString(undefined, {
															hour: "2-digit",
															minute: "2-digit",
														})}
													</span>
												</div>

												{/* Time tracked */}
												{!isLog && task.total_time_ms > 0 && (
													<div className="flex items-center gap-1 text-[11px] text-[#8b9a6b]">
														<Clock className="w-3 h-3" />
														<span>{formatTimeCompact(task.total_time_ms)}</span>
													</div>
												)}

												{/* Tag */}
												{tag && (
													<div className="flex items-center gap-1 text-[11px]">
														<span>{tag.emoji}</span>
														<span className="text-muted-foreground">
															{tag.label}
														</span>
													</div>
												)}

												{/* Pamphlet */}
												{pamphlet && (
													<span
														className={`text-[11px] font-medium ${PAMPHLET_COLORS[pamphlet.color].text}`}
													>
														{pamphlet.name}
													</span>
												)}
											</div>
										</div>
									);
								})}
							</div>
						))
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
