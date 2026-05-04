"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Course } from "@/lib/db/courses";
import { CourseCard } from "./course-card";
import { STATUS_CONFIG } from "./constants";

export function CategoryView({
	category,
	courses,
	search,
	onCourseClick,
}: {
	category: string;
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
				c.instructor?.toLowerCase().includes(lower),
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

	return (
		<div className="p-6 space-y-6">
			<div>
				<h2 className="text-lg font-semibold text-foreground capitalize">
					{category}
				</h2>
				<p className="text-sm text-muted-foreground mt-1">
					{filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""}
				</p>
			</div>

			{filteredCourses.length > 0 ? (
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
									<h3
										className={`text-sm font-semibold ${config.text} group-hover:opacity-80 transition-opacity`}
									>
										{config.label} ({statusCourses.length})
									</h3>
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
			) : (
				<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
					<p className="text-sm">
						{search
							? "No courses match your search"
							: "No courses in this category yet"}
					</p>
				</div>
			)}
		</div>
	);
}
