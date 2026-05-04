import type { Project } from "@/lib/db/projects";
import { CalendarDays } from "lucide-react";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "./constants";
import { formatDueDate } from "./utils";

export function ProjectCard({
	project,
	onClick,
}: {
	project: Project;
	onClick: () => void;
}) {
	const status = STATUS_CONFIG[project.status];
	const priority = project.priority ? PRIORITY_CONFIG[project.priority] : null;
	const dueLabel = formatDueDate(project.due_date);
	const isOverdue =
		project.due_date &&
		new Date(project.due_date) < new Date() &&
		project.status !== "completed";

	return (
		<div
			onClick={onClick}
			className="group relative bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-border/80 hover:bg-accent/30 transition-all duration-150 flex flex-col gap-3"
		>
			{/* Status + Priority */}
			<div className="flex items-center justify-between gap-2">
				<div
					className={`flex items-center gap-1.5 text-[10px] font-medium ${status.text}`}
				>
					<div
						className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.dot}`}
					/>
					{status.label}
				</div>
				{priority && (
					<span
						className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${priority.color} ${priority.bg}`}
					>
						{priority.label}
					</span>
				)}
			</div>

			{/* Title + Description */}
			<div className="flex-1 min-w-0">
				<p
					className={`text-sm font-medium leading-snug line-clamp-2 ${project.status === "completed" || project.status === "archived" ? "text-muted-foreground" : "text-foreground"}`}
				>
					{project.title}
				</p>
				{project.description && (
					<p className="text-[11px] text-muted-foreground/60 mt-0.5 line-clamp-2">
						{project.description}
					</p>
				)}
			</div>

			{/* Categories */}
			{project.category.length > 0 && (
				<div className="flex items-center gap-1.5 flex-wrap">
					{(Array.isArray(project.category) ? project.category : [project.category]).slice(0, 2).map((cat) => (
						<span key={cat} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
							{cat}
						</span>
					))}
					{(Array.isArray(project.category) ? project.category : [project.category]).length > 2 && (
						<span className="text-[10px] text-muted-foreground/60">
							+{(Array.isArray(project.category) ? project.category : [project.category]).length - 2} more
						</span>
					)}
				</div>
			)}

			{/* Footer */}
			<div className="flex items-center justify-between gap-2">
				{dueLabel && (
					<span
						className={`text-[10px] flex items-center gap-1 ${isOverdue ? "text-red-500" : "text-muted-foreground/50"}`}
					>
						<CalendarDays className="w-2.5 h-2.5" />
						{dueLabel}
					</span>
				)}

				{/* Progress bar */}
				{project.progress !== null && project.progress !== undefined && (
					<div className="flex items-center gap-1.5 flex-shrink-0">
						<div className="w-12 h-1 bg-secondary rounded-full overflow-hidden">
							<div
								className="h-full bg-[#8b9a6b] rounded-full transition-all"
								style={{ width: `${project.progress}%` }}
							/>
						</div>
						<span className="text-[10px] text-[#8b9a6b]">
							{project.progress}%
						</span>
					</div>
				)}
			</div>
		</div>
	);
}
