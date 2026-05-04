"use client";

import type { Course } from "@/lib/db/courses";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "./constants";

export function CourseCard({
	course,
	onClick,
}: {
	course: Course;
	onClick: () => void;
}) {
	const statusConfig = STATUS_CONFIG[course.status];
	const priority = course.priority ? PRIORITY_CONFIG[course.priority] : null;

	return (
		<button
			onClick={onClick}
			className="w-full text-left bg-card border border-border rounded-lg p-4 hover:border-ring transition-colors group"
		>
			{/* Header */}
			<div className="flex items-start justify-between gap-3 mb-2">
				<h3 className="font-semibold text-sm text-foreground group-hover:text-ring transition-colors flex-1">
					{course.title}
				</h3>
				{priority && (
					<span
						className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${priority.color} ${priority.bg} flex-shrink-0`}
					>
						{priority.label}
					</span>
				)}
			</div>

			{/* Description */}
			{course.description && (
				<p className="text-xs text-muted-foreground line-clamp-2 mb-3">
					{course.description}
				</p>
			)}

			{/* Meta info */}
			<div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
				{course.platform && (
					<span className="px-2 py-0.5 bg-secondary rounded-full">
						{course.platform}
					</span>
				)}
				{course.instructor && (
					<span className="px-2 py-0.5 bg-secondary rounded-full">
						{course.instructor}
					</span>
				)}
				{course.duration && (
					<span className="px-2 py-0.5 bg-secondary rounded-full">
						{course.duration}h
					</span>
				)}
			</div>

			{/* Progress bar */}
			{course.progress !== null && course.progress > 0 && (
				<div className="mt-3">
					<div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
						<span>Progress</span>
						<span>{course.progress}%</span>
					</div>
					<div className="h-1.5 bg-secondary rounded-full overflow-hidden">
						<div
							className="h-full bg-[#8b9a6b] rounded-full transition-all"
							style={{ width: `${course.progress}%` }}
						/>
					</div>
				</div>
			)}

			{/* Status */}
			<div className="mt-3 flex items-center justify-between">
				<span
					className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${statusConfig.bg} ${statusConfig.text}`}
				>
					<div className={`w-1 h-1 rounded-full ${statusConfig.dot}`} />
					{statusConfig.label}
				</span>
			</div>
		</button>
	);
}
