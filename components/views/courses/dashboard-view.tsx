"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Course } from "@/lib/db/courses";
import { CourseCard } from "./course-card";
import { STATUS_CONFIG } from "./constants";

export function DashboardView({
	courses,
	search,
	onCourseClick,
}: {
	courses: Course[];
	search: string;
	onCourseClick: (course: Course) => void;
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

	const filteredCourses = useMemo(() => {
		if (!search) return courses;
		const lower = search.toLowerCase();
		return courses.filter(
			(c) =>
				c.title.toLowerCase().includes(lower) ||
				c.description?.toLowerCase().includes(lower) ||
				c.platform?.toLowerCase().includes(lower) ||
				c.instructor?.toLowerCase().includes(lower) ||
				c.category.toLowerCase().includes(lower),
		);
	}, [courses, search]);

	const groupedByStatus = useMemo(() => {
		const groups: Record<string, Course[]> = {
			in_progress: [],
			not_started: [],
			paused: [],
			completed: [],
			dropped: [],
		};

		filteredCourses.forEach((course) => {
			groups[course.status].push(course);
		});

		return groups;
	}, [filteredCourses]);

	const stats = useMemo(() => {
		return {
			total: courses.length,
			in_progress: courses.filter((c) => c.status === "in_progress").length,
			completed: courses.filter((c) => c.status === "completed").length,
			not_started: courses.filter((c) => c.status === "not_started").length,
		};
	}, [courses]);

	return (
		<div className="p-6 space-y-6">
			{/* Stats */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
				<div className="bg-card border border-border rounded-lg p-4">
					<div className="text-2xl font-bold text-foreground">{stats.total}</div>
					<div className="text-xs text-muted-foreground mt-1">Total Courses</div>
				</div>
				<div className="bg-card border border-border rounded-lg p-4">
					<div className="text-2xl font-bold text-sky-500">
						{stats.in_progress}
					</div>
					<div className="text-xs text-muted-foreground mt-1">In Progress</div>
				</div>
				<div className="bg-card border border-border rounded-lg p-4">
					<div className="text-2xl font-bold text-[#8b9a6b]">
						{stats.completed}
					</div>
					<div className="text-xs text-muted-foreground mt-1">Completed</div>
				</div>
				<div className="bg-card border border-border rounded-lg p-4">
					<div className="text-2xl font-bold text-muted-foreground">
						{stats.not_started}
					</div>
					<div className="text-xs text-muted-foreground mt-1">Not Started</div>
				</div>
			</div>

			{/* Courses by Status */}
			<div className="space-y-6">
				{Object.entries(groupedByStatus).map(([status, statusCourses]) => {
					if (statusCourses.length === 0) return null;
					const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
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
								<div className={`w-2 h-2 rounded-full ${config.dot}`} />
								<h2
									className={`text-sm font-semibold flex items-center gap-2 ${config.text} group-hover:opacity-80 transition-opacity`}
								>
									{config.label} ({statusCourses.length})
								</h2>
							</button>
							{!collapsed && (
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
									{statusCourses.map((course) => (
										<CourseCard
											key={course.id}
											course={course}
											onClick={() => onCourseClick(course)}
										/>
									))}
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Empty state */}
			{filteredCourses.length === 0 && (
				<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
					<p className="text-sm">
						{search ? "No courses match your search" : "No courses yet"}
					</p>
				</div>
			)}
		</div>
	);
}
