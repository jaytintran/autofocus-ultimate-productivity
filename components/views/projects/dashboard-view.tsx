import { useMemo, useState } from "react";
import type { Project, ProjectStatus } from "@/lib/db/projects";
import { Target, Flame, CheckCircle2, Circle, X } from "lucide-react";
import { ProjectCard } from "./project-card";
import { sortByPriority } from "./utils";

type FilterStatus = ProjectStatus | "all" | null;

export function DashboardView({
	projects,
	search,
	onProjectClick,
}: {
	projects: Project[];
	search: string;
	onProjectClick: (p: Project) => void;
}) {
	const [filterStatus, setFilterStatus] = useState<FilterStatus>(null);
	const stats = useMemo(
		() => ({
			total: projects.length,
			active: projects.filter((p) => p.status === "active").length,
			completed: projects.filter((p) => p.status === "completed").length,
			planning: projects.filter((p) => p.status === "planning").length,
		}),
		[projects],
	);

	const activeProjects = useMemo(
		() => projects.filter((p) => p.status === "active").sort(sortByPriority),
		[projects],
	);

	const completedProjects = useMemo(
		() => projects.filter((p) => p.status === "completed").sort(sortByPriority),
		[projects],
	);

	const filteredProjects = useMemo(() => {
		const q = search.trim().toLowerCase();
		let result = projects;

		// Apply status filter
		if (filterStatus && filterStatus !== "all") {
			result = result.filter((p) => p.status === filterStatus);
		}

		// Apply search filter
		if (q) {
			result = result.filter(
				(p) =>
					p.title.toLowerCase().includes(q) ||
					(p.description ?? "").toLowerCase().includes(q),
			);
		}

		return result.sort(sortByPriority);
	}, [projects, search, filterStatus]);

	const isSearching = search.trim().length > 0;
	const isFiltering = filterStatus !== null;

	return (
		<div className="px-4 sm:px-6 py-6 pb-10 space-y-8">
			{/* Stats */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				{[
					{
						label: "Total",
						value: stats.total,
						icon: Target,
						color: "text-foreground",
						bg: "bg-secondary/60",
						status: "all" as const,
					},
					{
						label: "Active",
						value: stats.active,
						icon: Flame,
						color: "text-sky-500",
						bg: "bg-sky-500/10",
						status: "active" as const,
					},
					{
						label: "Completed",
						value: stats.completed,
						icon: CheckCircle2,
						color: "text-[#8b9a6b]",
						bg: "bg-[#8b9a6b]/10",
						status: "completed" as const,
					},
					{
						label: "Planning",
						value: stats.planning,
						icon: Circle,
						color: "text-amber-500",
						bg: "bg-amber-500/10",
						status: "planning" as const,
					},
				].map(({ label, value, icon: Icon, color, bg, status }) => {
					const isActive = filterStatus === status;
					return (
						<button
							key={label}
							onClick={() => setFilterStatus(isActive ? null : status)}
							className={`${bg} rounded-xl p-4 flex flex-col gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${
								isActive ? "ring-2 ring-offset-2 ring-offset-background ring-current" : ""
							}`}
						>
							<Icon className={`w-4 h-4 ${color}`} />
							<p className={`text-2xl font-bold ${color}`}>{value}</p>
							<p className="text-[11px] text-muted-foreground/70 uppercase tracking-wider">
								{label}
							</p>
						</button>
					);
				})}
			</div>

			{/* Active filter indicator */}
			{filterStatus && (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<span>
						Showing{" "}
						<span className="font-medium text-foreground">
							{filterStatus === "all" ? "all" : filterStatus}
						</span>{" "}
						projects
					</span>
					<button
						onClick={() => setFilterStatus(null)}
						className="ml-1 p-1 hover:bg-secondary rounded-md transition-colors"
						aria-label="Clear filter"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				</div>
			)}

			{/* Filtered results */}
			{(isSearching || filterStatus) && (
				<div className="space-y-3">
					<h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
						{isSearching ? "Search Results" : "Filtered Projects"}
					</h3>
					{filteredProjects.length > 0 ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
							{filteredProjects.map((p) => (
								<ProjectCard
									key={p.id}
									project={p}
									onClick={() => onProjectClick(p)}
								/>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No projects found</p>
					)}
				</div>
			)}

			{/* Default view - show Active and Completed sections */}
			{!isSearching && !filterStatus && (
				<>
					{/* Active */}
					{activeProjects.length > 0 && (
						<div className="space-y-3">
							<div className="flex items-center gap-2">
								<Flame className="w-3.5 h-3.5 text-sky-500" />
								<h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
									Active
								</h3>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
								{activeProjects.map((p) => (
									<ProjectCard
										key={p.id}
										project={p}
										onClick={() => onProjectClick(p)}
									/>
								))}
							</div>
						</div>
					)}

					{/* Completed */}
					{completedProjects.length > 0 && (
						<div className="space-y-3">
							<div className="flex items-center gap-2">
								<CheckCircle2 className="w-3.5 h-3.5 text-[#8b9a6b]" />
								<h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
									Completed
								</h3>
								<span className="text-[10px] text-muted-foreground/40 tabular-nums">
									{completedProjects.length}
								</span>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
								{completedProjects.map((p) => (
									<ProjectCard
										key={p.id}
										project={p}
										onClick={() => onProjectClick(p)}
									/>
								))}
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
