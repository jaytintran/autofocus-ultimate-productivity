"use client";

import { useState, useMemo, useEffect } from "react";
import type { Course, CourseStatus } from "@/lib/db/courses";
import { Search, GraduationCap, X } from "lucide-react";
import { STATUS_CONFIG } from "@/components/views/courses/constants";

export function CompactCoursesList({
	courses,
	onCourseClick,
	onStatusChange,
	searchQuery,
	onSearchChange,
	onAddCourse,
}: {
	courses: Course[];
	onCourseClick: (course: Course) => void;
	onStatusChange: (id: string, status: CourseStatus) => Promise<void>;
	searchQuery: string;
	onSearchChange: (query: string) => void;
	onAddCourse: () => void;
}) {
	const [expandedStatuses, setExpandedStatuses] = useState<Set<CourseStatus>>(() => {
		const saved = localStorage.getItem("timer-courses-expanded");
		if (saved) {
			try {
				return new Set(JSON.parse(saved));
			} catch {
				return new Set();
			}
		}
		return new Set();
	});
	const [debouncedQuery, setDebouncedQuery] = useState("");

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	useEffect(() => {
		localStorage.setItem("timer-courses-expanded", JSON.stringify(Array.from(expandedStatuses)));
	}, [expandedStatuses]);

	const filteredCourses = useMemo(() => {
		if (!debouncedQuery.trim()) return null;
		const lower = debouncedQuery.toLowerCase();
		return courses.filter(
			(c) => {
				const categories = Array.isArray(c.category) ? c.category : [c.category];
				return (
					c.title.toLowerCase().includes(lower) ||
					c.description?.toLowerCase().includes(lower) ||
					c.platform?.toLowerCase().includes(lower) ||
					c.instructor?.toLowerCase().includes(lower) ||
					categories.some((cat) => cat.toLowerCase().includes(lower))
				);
			}
		);
	}, [courses, debouncedQuery]);

	const groupedByStatus = useMemo(() => {
		const groups: Record<CourseStatus, Course[]> = {
			not_started: [],
			in_progress: [],
			paused: [],
			completed: [],
			dropped: [],
		};

		const coursesToGroup = filteredCourses !== null ? filteredCourses : courses;

		coursesToGroup.forEach((course) => {
			groups[course.status].push(course);
		});

		return groups;
	}, [filteredCourses, courses]);

	const statusOrder: CourseStatus[] = [
		"in_progress",
		"not_started",
		"paused",
		"completed",
		"dropped",
	];

	return (
		<div className="space-y-3">
			{/* Search with Add Button */}
			<div className="flex items-center gap-2">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Search courses..."
						className="w-full pl-9 pr-9 py-2 text-sm bg-secondary/50 border border-border rounded-lg outline-none focus:border-[#8b9a6b]/50 transition-colors placeholder:text-muted-foreground/50"
					/>
					{searchQuery && (
						<button
							onClick={() => onSearchChange("")}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					)}
				</div>
				<button
					onClick={onAddCourse}
					className="px-3 py-2 bg-secondary/50 border border-border rounded-lg hover:bg-secondary transition-colors shrink-0 flex items-center gap-1.5 text-sm font-medium"
					title="Add Course"
				>
					<GraduationCap className="w-3.5 h-3.5" />
					<span>Add</span>
				</button>
			</div>

			{/* Search Results */}
			{filteredCourses !== null ? (
				filteredCourses.length > 0 ? (
					<div className="grid grid-cols-2 gap-2">
						{filteredCourses.map((course) => {
							const progress =
								course.progress !== null && course.progress > 0
									? course.progress
									: null;

							return (
								<button
									key={course.id}
									onClick={() => onCourseClick(course)}
									className="w-full text-left px-2 py-1.5 hover:bg-accent rounded border border-border transition-colors group"
								>
									<div className="flex items-start gap-2">
										<GraduationCap className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
										<div className="flex-1 min-w-0">
											<p className="text-xs font-medium text-foreground truncate group-hover:text-[#8b9a6b] transition-colors">
												{course.title}
											</p>
											{(course.platform || course.instructor) && (
												<p className="text-[10px] text-muted-foreground truncate mt-0.5">
													{[course.platform, course.instructor]
														.filter(Boolean)
														.join(" • ")}
												</p>
											)}
											{progress !== null && (
												<div className="mt-1">
													<div className="h-1 bg-secondary rounded-full overflow-hidden">
														<div
															className="h-full bg-[#8b9a6b] rounded-full transition-all"
															style={{ width: `${progress}%` }}
														/>
													</div>
												</div>
											)}
										</div>
									</div>
								</button>
							);
						})}
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
						<GraduationCap className="w-8 h-8 mb-2 opacity-20" />
						<p className="text-xs">No courses match your search</p>
					</div>
				)
			) : (
				<>
					{/* Courses by status */}
					<div className="space-y-2">
						{statusOrder.map((status) => {
							const statusCourses = groupedByStatus[status];
							if (statusCourses.length === 0) return null;

							const config = STATUS_CONFIG[status];
							const isExpanded = expandedStatuses.has(status);

							const toggleStatus = () => {
								setExpandedStatuses((prev) => {
									const next = new Set(prev);
									if (next.has(status)) {
										next.delete(status);
									} else {
										next.add(status);
									}
									return next;
								});
							};

							return (
								<div key={status} className="space-y-1">
									<button
										onClick={toggleStatus}
										className="w-full flex items-center justify-between px-2 py-1 hover:bg-accent rounded transition-colors"
									>
										<span
											className={`text-xs font-medium flex items-center gap-1.5 ${config.text}`}
										>
											<div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
											{config.label}
										</span>
										<span className="text-xs text-muted-foreground">
											{statusCourses.length}
										</span>
									</button>

									{isExpanded && (
										<div className="grid grid-cols-2 gap-2 pl-2">
											{statusCourses.map((course) => {
												const progress =
													course.progress !== null && course.progress > 0
														? course.progress
														: null;

												return (
													<button
														key={course.id}
														onClick={() => onCourseClick(course)}
														className="w-full text-left px-2 py-1.5 hover:bg-accent rounded border border-border transition-colors group"
													>
														<div className="flex items-start gap-2">
															<GraduationCap className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
															<div className="flex-1 min-w-0">
																<p className="text-xs font-medium text-foreground truncate group-hover:text-[#8b9a6b] transition-colors">
																	{course.title}
																</p>
																{(course.platform || course.instructor) && (
																	<p className="text-[10px] text-muted-foreground truncate mt-0.5">
																		{[course.platform, course.instructor]
																			.filter(Boolean)
																			.join(" • ")}
																	</p>
																)}
																{progress !== null && (
																	<div className="mt-1">
																		<div className="h-1 bg-secondary rounded-full overflow-hidden">
																			<div
																				className="h-full bg-[#8b9a6b] rounded-full transition-all"
																				style={{ width: `${progress}%` }}
																			/>
																		</div>
																	</div>
																)}
															</div>
														</div>
													</button>
												);
											})}
										</div>
									)}
								</div>
							);
						})}
					</div>

					{/* Empty state */}
					{courses.length === 0 && (
						<div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
							<GraduationCap className="w-8 h-8 mb-2 opacity-20" />
							<p className="text-xs">No courses yet</p>
						</div>
					)}
				</>
			)}
		</div>
	);
}
