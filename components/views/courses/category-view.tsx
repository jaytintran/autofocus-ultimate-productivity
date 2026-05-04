"use client";

import { useMemo } from "react";
import type { Course } from "@/lib/db/courses";
import { CourseCard } from "./course-card";

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

	return (
		<div className="p-6">
			<div className="mb-6">
				<h2 className="text-lg font-semibold text-foreground capitalize">
					{category}
				</h2>
				<p className="text-sm text-muted-foreground mt-1">
					{filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""}
				</p>
			</div>

			{filteredCourses.length > 0 ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredCourses.map((course) => (
						<CourseCard
							key={course.id}
							course={course}
							onClick={() => onCourseClick(course)}
						/>
					))}
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
