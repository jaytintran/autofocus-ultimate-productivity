"use client";

import { useMemo, useState } from "react";
import { FolderKanban, CalendarDays, ChevronDown, ChevronRight } from "lucide-react";
import type { Project, ProjectStatus } from "@/lib/db/projects";
import { STATUS_CONFIG } from "@/components/views/projects/constants";

interface CompactProjectsListProps {
	projects: Project[];
	onProjectClick?: (project: Project) => void;
	onStatusChange?: (id: string, status: ProjectStatus) => void;
}

export function CompactProjectsList({
	projects,
	onProjectClick,
	onStatusChange,
}: CompactProjectsListProps) {
	const [statusDropdown, setStatusDropdown] = useState<string | null>(null);
	const [showCompleted, setShowCompleted] = useState(false);

	const activeProjects = useMemo(
		() => projects.filter((p) => p.status === "active"),
		[projects],
	);

	const planningProjects = useMemo(
		() => projects.filter((p) => p.status === "planning"),
		[projects],
	);

	const completedProjects = useMemo(
		() => projects.filter((p) => p.status === "completed"),
		[projects],
	);

	const handleStatusClick = (e: React.MouseEvent, projectId: string) => {
		e.stopPropagation();
		setStatusDropdown(statusDropdown === projectId ? null : projectId);
	};

	const handleStatusChange = (
		e: React.MouseEvent,
		projectId: string,
		status: ProjectStatus,
	) => {
		e.stopPropagation();
		onStatusChange?.(projectId, status);
		setStatusDropdown(null);
	};

	if (activeProjects.length === 0 && planningProjects.length === 0 && completedProjects.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
				<FolderKanban className="w-6 h-6 opacity-20" />
				<p className="text-xs">No projects yet</p>
			</div>
		);
	}

	const renderProjectCard = (project: Project) => {
		const isOverdue =
			project.due_date &&
			new Date(project.due_date) < new Date() &&
			project.status !== "completed";

		const dueLabel = project.due_date ? formatDueDate(project.due_date) : null;
		const status = STATUS_CONFIG[project.status];

		return (
			<div
				key={project.id}
				onClick={() => onProjectClick?.(project)}
				className="group relative flex items-start gap-3 p-4 rounded-lg border border-border hover:border-border/80 hover:bg-accent/30 transition-all cursor-pointer min-h-[100px]"
			>
				{/* Status badge - top right corner */}
				<div className="absolute top-3 right-3 z-10">
					<button
						onClick={(e) => handleStatusClick(e, project.id)}
						className={`flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.text} hover:opacity-80 transition-opacity`}
					>
						<div className={`w-1 h-1 rounded-full ${status.dot}`} />
						{status.label}
					</button>

					{/* Status dropdown */}
					{statusDropdown === project.id && (
						<div className="absolute top-full right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[120px] z-50">
							{(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map(
								(statusKey) => {
									const statusOption = STATUS_CONFIG[statusKey];
									return (
										<button
											key={statusKey}
											onClick={(e) => handleStatusChange(e, project.id, statusKey)}
											className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-2 ${
												project.status === statusKey ? "bg-accent/50" : ""
											}`}
										>
											<div
												className={`w-1.5 h-1.5 rounded-full ${statusOption.dot}`}
											/>
											{statusOption.label}
										</button>
									);
								},
							)}
						</div>
					)}
				</div>

				{/* Priority badge - bottom right corner */}
				{project.priority && (
					<div className="absolute bottom-3 right-3">
						<span
							className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${getPriorityStyle(project.priority)}`}
						>
							{project.priority}
						</span>
					</div>
				)}

				{/* Project icon */}
				<div className="w-10 h-10 rounded-md bg-[#8b9a6b]/10 flex items-center justify-center flex-shrink-0">
					<FolderKanban className="w-5 h-5 text-[#8b9a6b]" />
				</div>

				{/* Content */}
				<div className="flex-1 min-w-0 pr-24">
					<p className="text-sm font-medium text-foreground truncate mb-1">
						{project.title}
					</p>
					<div className="flex items-center gap-2 mb-2">
						<span className="text-[10px] text-muted-foreground/60 truncate">
							{project.category}
						</span>
						{dueLabel && (
							<span
								className={`text-[9px] flex items-center gap-1 ${isOverdue ? "text-red-500" : "text-muted-foreground/50"}`}
							>
								<CalendarDays className="w-2.5 h-2.5" />
								{dueLabel}
							</span>
						)}
					</div>

					{/* Progress bar */}
					{project.progress !== null && project.progress !== undefined && (
						<div className="flex items-center gap-2 mt-auto">
							<div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
								<div
									className="h-full bg-[#8b9a6b] rounded-full transition-all"
									style={{ width: `${project.progress}%` }}
								/>
							</div>
							<span className="text-[9px] text-[#8b9a6b] font-medium">
								{project.progress}%
							</span>
						</div>
					)}
				</div>
			</div>
		);
	};

	return (
		<div className="flex flex-col gap-4">
			{/* Active Projects */}
			{activeProjects.length > 0 && (
				<div className="flex flex-col gap-2">
					<h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">
						Active ({activeProjects.length})
					</h3>
					{activeProjects.map(renderProjectCard)}
				</div>
			)}

			{/* Planning Projects */}
			{planningProjects.length > 0 && (
				<div className="flex flex-col gap-2">
					<h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">
						Planning ({planningProjects.length})
					</h3>
					{planningProjects.map(renderProjectCard)}
				</div>
			)}

			{/* Completed Projects Section */}
			{completedProjects.length > 0 && (
				<div className="flex flex-col gap-2">
					<button
						onClick={() => setShowCompleted(!showCompleted)}
						className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1 px-1"
					>
						{showCompleted ? (
							<ChevronDown className="w-3 h-3" />
						) : (
							<ChevronRight className="w-3 h-3" />
						)}
						Completed Projects ({completedProjects.length})
					</button>

					{showCompleted && (
						<div className="flex flex-col gap-2">
							{completedProjects.map((project) => {
								const status = STATUS_CONFIG[project.status];

								return (
									<div
										key={project.id}
										onClick={() => onProjectClick?.(project)}
										className="group relative flex items-start gap-3 p-4 rounded-lg border border-border hover:border-border/80 hover:bg-accent/30 transition-all cursor-pointer opacity-60 hover:opacity-100 min-h-[100px]"
									>
										{/* Status badge */}
										<div className="absolute top-3 right-3 z-10">
											<button
												onClick={(e) => handleStatusClick(e, project.id)}
												className={`flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.text} hover:opacity-80 transition-opacity`}
											>
												<div className={`w-1 h-1 rounded-full ${status.dot}`} />
												{status.label}
											</button>

											{statusDropdown === project.id && (
												<div className="absolute top-full right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[120px] z-50">
													{(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map(
														(statusKey) => {
															const statusOption = STATUS_CONFIG[statusKey];
															return (
																<button
																	key={statusKey}
																	onClick={(e) =>
																		handleStatusChange(e, project.id, statusKey)
																	}
																	className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-2 ${
																		project.status === statusKey ? "bg-accent/50" : ""
																	}`}
																>
																	<div
																		className={`w-1.5 h-1.5 rounded-full ${statusOption.dot}`}
																	/>
																	{statusOption.label}
																</button>
															);
														},
													)}
												</div>
											)}
										</div>

										{/* Priority badge - bottom right corner */}
										{project.priority && (
											<div className="absolute bottom-3 right-3">
												<span
													className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${getPriorityStyle(project.priority)}`}
												>
													{project.priority}
												</span>
											</div>
										)}

										{/* Project icon */}
										<div className="w-10 h-10 rounded-md bg-[#8b9a6b]/10 flex items-center justify-center flex-shrink-0">
											<FolderKanban className="w-5 h-5 text-[#8b9a6b]" />
										</div>

										{/* Content */}
										<div className="flex-1 min-w-0 pr-24">
											<p className="text-sm font-medium text-muted-foreground truncate mb-1">
												{project.title}
											</p>
											<span className="text-[10px] text-muted-foreground/60 truncate">
												{project.category}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function formatDueDate(dueDate: string | null): string | null {
	if (!dueDate) return null;
	const date = new Date(dueDate);
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Tomorrow";
	if (diffDays <= 7) return `${diffDays}d`;
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getPriorityStyle(priority: string): string {
	switch (priority) {
		case "CRITICAL":
			return "text-red-600 bg-red-500/10";
		case "HIGH":
			return "text-orange-600 bg-orange-500/10";
		case "MEDIUM":
			return "text-blue-600 bg-blue-500/10";
		case "LOW":
			return "text-gray-600 bg-gray-500/10";
		default:
			return "text-muted-foreground bg-muted";
	}
}
