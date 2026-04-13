import { useMemo } from "react";
import type { Project } from "@/lib/db/projects";
import { Target, Flame, CheckCircle2, Circle } from "lucide-react";
import { ProjectCard } from "./project-card";
import { sortByPriority } from "./utils";

export function DashboardView({
	projects,
	search,
	onProjectClick,
}: {
	projects: Project[];
	search: string;
	onProjectClick: (p: Project) => void;
}) {
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
		if (!q) return [];
		return projects.filter(
			(p) =>
				p.title.toLowerCase().includes(q) ||
				(p.description ?? "").toLowerCase().includes(q),
		);
	}, [projects, search]);

	const isSearching = search.trim().length > 0;

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
					},
					{
						label: "Active",
						value: stats.active,
						icon: Flame,
						color: "text-sky-500",
						bg: "bg-sky-500/10",
					},
					{
						label: "Completed",
						value: stats.completed,
						icon: CheckCircle2,
						color: "text-[#8b9a6b]",
						bg: "bg-[#8b9a6b]/10",
					},
					{
						label: "Planning",
						value: stats.planning,
						icon: Circle,
						color: "text-amber-500",
						bg: "bg-amber-500/10",
					},
				].map(({ label, value, icon: Icon, color, bg }) => (
					<div
						key={label}
						className={`${bg} rounded-xl p-4 flex flex-col gap-2`}
					>
						<Icon className={`w-4 h-4 ${color}`} />
						<p className={`text-2xl font-bold ${color}`}>{value}</p>
						<p className="text-[11px] text-muted-foreground/70 uppercase tracking-wider">
							{label}
						</p>
					</div>
				))}
			</div>

			{/* Search results */}
			{isSearching && filteredProjects.length > 0 && (
				<div className="space-y-3">
					<h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
						Search Results
					</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{filteredProjects.map((p) => (
							<ProjectCard
								key={p.id}
								project={p}
								onClick={() => onProjectClick(p)}
							/>
						))}
					</div>
				</div>
			)}

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
		</div>
	);
}
