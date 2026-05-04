import { useMemo, useState } from "react";
import type { Project, ProjectStatus } from "@/lib/db/projects";
import { ChevronRight } from "lucide-react";
import { ProjectCard } from "./project-card";
import { STATUS_CONFIG } from "./constants";
import { sortByPriority } from "./utils";

export function CategoryView({
	category,
	projects,
	search,
	onProjectClick,
}: {
	category: string;
	projects: Project[];
	search: string;
	onProjectClick: (p: Project) => void;
}) {
	const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
		new Set(),
	);

	const toggleSection = (status: string) => {
		setCollapsedSections((prev) => {
			const next = new Set(prev);
			if (next.has(status)) {
				next.delete(status);
			} else {
				next.add(status);
			}
			return next;
		});
	};

	const filtered = useMemo(() => {
		if (!search.trim()) return projects;
		const q = search.toLowerCase();
		return projects.filter(
			(p) =>
				p.title.toLowerCase().includes(q) ||
				(p.description ?? "").toLowerCase().includes(q),
		);
	}, [projects, search]);

	const grouped = useMemo(() => {
		const order: ProjectStatus[] = [
			"active",
			"planning",
			"paused",
			"completed",
			"archived",
		];
		const map = new Map<ProjectStatus, Project[]>();
		order.forEach((s) => map.set(s, []));
		filtered.forEach((p) => map.get(p.status)?.push(p));
		order.forEach((s) => map.get(s)!.sort(sortByPriority));
		return order
			.filter((s) => map.get(s)!.length > 0)
			.map((s) => ({
				status: s,
				projects: map.get(s)!,
			}));
	}, [filtered]);

	return (
		<div className="px-4 sm:px-6 py-6 pb-10 space-y-8">
			<div className="space-y-1">
				<h2 className="text-lg font-semibold text-foreground">{category}</h2>
				<p className="text-xs text-muted-foreground/60">
					{filtered.length} {filtered.length === 1 ? "project" : "projects"}
				</p>
			</div>

			{filtered.length === 0 && (
				<p className="text-sm text-muted-foreground">
					No projects match your search.
				</p>
			)}

			{grouped.map(({ status, projects: statusProjects }) => {
				const cfg = STATUS_CONFIG[status];
				const collapsed = collapsedSections.has(status);
				return (
					<div key={status} className="space-y-3">
						<button
							onClick={() => toggleSection(status)}
							className="flex items-center gap-2 w-full group"
						>
							<ChevronRight
								className={`w-4 h-4 text-muted-foreground transition-transform ${collapsed ? "" : "rotate-90"}`}
							/>
							<div
								className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`}
							/>
							<h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
								{cfg.label}
							</h3>
							<div className="flex-1 h-px bg-border/40" />
							<span className="text-[10px] text-muted-foreground/40">
								{statusProjects.length}
							</span>
						</button>
						{!collapsed && (
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
								{statusProjects.map((p) => (
									<ProjectCard
										key={p.id}
										project={p}
										onClick={() => onProjectClick(p)}
									/>
								))}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
