"use client";

import { Settings, BookOpen, X, Folder, Flame, School } from "lucide-react";
import { useState } from "react";
import { AboutSection } from "@/components/shared/about-section";
import { SettingsModal } from "@/components/shared/settings/settings-modal";

import { BookView } from "@/components/views/books/book-view";
import { ProjectView } from "@/components/views/projects/project-view";
import { HabitView } from "@/components/views/habits/habit-view";
import { CourseView } from "@/components/views/courses/course-view";

export function Header() {
	const [showSettings, setShowSettings] = useState(false);
	const [showBooks, setShowBooks] = useState(false);
	const [showProjects, setShowProjects] = useState(false);
	const [showHabits, setShowHabits] = useState(false);
	const [showCourses, setShowCourses] = useState(false);

	return (
		<header className="flex items-center justify-between px-6 py-4 relative">
			<div>
				<h1 className="text-sm tracking-[0.3em] font-medium">
					AUT<span className="text-af4-olive">O</span>FOCUS
				</h1>
				<p className="text-[0.625rem] uppercase text-muted-foreground mt-0.5">
					AF4 — One list. One task. Trust the process.
				</p>
			</div>
			<div className="flex items-center gap-2">
				{/* Book Button */}
				<button
					onClick={() => setShowBooks(true)}
					className="p-2 hover:bg-accent rounded transition-colors"
					aria-label="Books"
					title="Library"
				>
					<BookOpen className="w-4 h-4" />
				</button>

				{/* Projects Button */}
				<button
					onClick={() => setShowProjects(true)}
					className="p-2 hover:bg-accent rounded transition-colors"
					aria-label="Projects"
					title="Projects"
				>
					<Folder className="w-4 h-4" />
				</button>

				{/* Courses Button */}
				<button
					onClick={() => setShowCourses(true)}
					className="p-2 hover:bg-accent rounded transition-colors"
					aria-label="Courses"
					title="Courses"
				>
					<School className="w-4 h-4" />
				</button>

				{/* Habits Button */}
				<button
					onClick={() => setShowHabits(true)}
					className="p-2 hover:bg-accent rounded transition-colors"
					aria-label="Habits"
					title="Habits"
				>
					<Flame className="w-4 h-4" />
				</button>

				<AboutSection />

				{/* Settings Button - now includes font and theme togglers */}
				<button
					onClick={() => setShowSettings(true)}
					className="p-2 hover:bg-accent rounded transition-colors"
					aria-label="Settings"
					title="Settings"
				>
					<Settings className="w-4 h-4" />
				</button>
			</div>

			<SettingsModal
				isOpen={showSettings}
				onClose={() => setShowSettings(false)}
			/>

			{/* Books overlay */}
			{showBooks && (
				<div className="fixed inset-0 z-50 bg-background flex flex-col">
					{/* Books header */}
					<div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
						<div>
							<h2 className="text-sm tracking-[0.3em] font-medium">
								LIB<span className="text-af4-olive">R</span>ARY
							</h2>
							<p className="text-[0.625rem] uppercase text-muted-foreground mt-0.5">
								Your reading stack
							</p>
						</div>
						<button
							onClick={() => setShowBooks(false)}
							className="p-2 hover:bg-accent rounded transition-colors"
							aria-label="Close library"
						>
							<X className="w-4 h-4" />
						</button>
					</div>

					{/* Books content */}
					<div className="flex-1 min-h-0">
						<BookView />
					</div>
				</div>
			)}

			{/* Projects overlay */}
			{showProjects && (
				<div className="fixed inset-0 z-50 bg-background flex flex-col">
					<div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
						<div>
							<h2 className="text-sm tracking-[0.3em] font-medium">
								PRO<span className="text-af4-olive">J</span>ECTS
							</h2>
							<p className="text-[0.625rem] uppercase text-muted-foreground mt-0.5">
								Your active work
							</p>
						</div>
						<button
							onClick={() => setShowProjects(false)}
							className="p-2 hover:bg-accent rounded transition-colors"
							aria-label="Close projects"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
					<div className="flex-1 min-h-0">
						<ProjectView />
					</div>
				</div>
			)}

			{/* Habits overlay */}
			{showHabits && (
				<div className="fixed inset-0 z-50 bg-background flex flex-col">
					<div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
						<div>
							<h2 className="text-sm tracking-[0.3em] font-medium">
								H<span className="text-af4-olive">A</span>BITS
							</h2>
							<p className="text-[0.625rem] uppercase text-muted-foreground mt-0.5">
								Your active habits
							</p>
						</div>
						<button
							onClick={() => setShowHabits(false)}
							className="p-2 hover:bg-accent rounded transition-colors"
							aria-label="Close habits"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
					<div className="flex-1 min-h-0">
						<HabitView />
					</div>
				</div>
			)}

			{/* Courses overlay */}
			{showCourses && (
				<div className="fixed inset-0 z-50 bg-background flex flex-col">
					<div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
						<div>
							<h2 className="text-sm tracking-[0.3em] font-medium">
								C<span className="text-af4-olive">O</span>URSES
							</h2>
							<p className="text-[0.625rem] uppercase text-muted-foreground mt-0.5">
								Your learning journey
							</p>
						</div>
						<button
							onClick={() => setShowCourses(false)}
							className="p-2 hover:bg-accent rounded transition-colors"
							aria-label="Close courses"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
					<div className="flex-1 min-h-0">
						<CourseView />
					</div>
				</div>
			)}
		</header>
	);
}
