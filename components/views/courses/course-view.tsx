"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useCourses } from "@/hooks/data/use-courses";
import type { Course, CourseStatus } from "@/lib/db/courses";
import { Menu, Edit, Trash2 } from "lucide-react";
import { CATEGORY_ORDER } from "./constants";
import { CourseModal } from "./course-modal";
import { AddCourseModal } from "./add-course-modal";
import { DashboardView } from "./dashboard-view";
import { CategoryView } from "./category-view";
import { EditCategoryModal } from "./edit-category-modal";
import { CourseSidebar } from "./course-sidebar";

export function CourseView() {
	const {
		courses,
		isLoading,
		handleUpdate,
		handleAdd,
		handleDelete,
		handleStatusChange,
	} = useCourses();

	const [activeCategory, setActiveCategory] = useState("__dashboard__");
	const [selectedCourseId, setSelectedCourseId] = useState<string | null>(
		null,
	);
	const [showAddModal, setShowAddModal] = useState(false);
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [categoryMenu, setCategoryMenu] = useState<{
		category: string;
		x: number;
		y: number;
	} | null>(null);
	const [editingCategory, setEditingCategory] = useState<string | null>(null);
	const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
	const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(search), 300);
		return () => clearTimeout(t);
	}, [search]);

	useEffect(() => {
		if (!categoryMenu) return;
		const handler = () => setCategoryMenu(null);
		window.addEventListener("click", handler);
		return () => window.removeEventListener("click", handler);
	}, [categoryMenu]);

	const handleCategoryMouseDown = (e: React.MouseEvent, category: string) => {
		longPressTimer.current = setTimeout(() => {
			setCategoryMenu({ category, x: e.clientX, y: e.clientY });
		}, 500);
	};

	const handleCategoryMouseUp = () => {
		if (longPressTimer.current) clearTimeout(longPressTimer.current);
	};

	const handleCategoryContextMenu = (e: React.MouseEvent, category: string) => {
		e.preventDefault();
		setCategoryMenu({ category, x: e.clientX, y: e.clientY });
	};

	const handleUpdateCategory = async (oldName: string, newName: string) => {
		const affected = courses.filter((c) => c.category.includes(oldName));
		await Promise.all(
			affected.map((c) => {
				const updatedCategories = c.category.map((cat) =>
					cat === oldName ? newName : cat
				);
				return handleUpdate(c.id, { category: updatedCategories });
			}),
		);
		if (activeCategory === oldName) setActiveCategory(newName);
	};

	const handleDeleteCategory = async (category: string) => {
		const affected = courses.filter((c) => c.category.includes(category));
		await Promise.all(
			affected.map((c) => {
				const updatedCategories = c.category.filter((cat) => cat !== category);
				if (updatedCategories.length === 0) {
					return handleDelete(c.id);
				}
				return handleUpdate(c.id, { category: updatedCategories });
			}),
		);
		if (activeCategory === category) setActiveCategory("__dashboard__");
	};

	const selectedCourse = useMemo(
		() => courses.find((c) => c.id === selectedCourseId) ?? null,
		[courses, selectedCourseId],
	);

	const categories = useMemo(() => {
		const allCategories = new Set<string>();
		courses.forEach((c) => {
			// Handle both old format (string) and new format (array)
			const categories = Array.isArray(c.category) ? c.category : [c.category];
			categories.forEach((cat) => allCategories.add(cat));
		});
		const existing = Array.from(allCategories);
		return existing.sort((a, b) => {
			const indexA = CATEGORY_ORDER.indexOf(a.toLowerCase());
			const indexB = CATEGORY_ORDER.indexOf(b.toLowerCase());
			if (indexA === -1 && indexB === -1) return a.localeCompare(b);
			if (indexA === -1) return 1;
			if (indexB === -1) return -1;
			return indexA - indexB;
		});
	}, [courses]);

	const categoryCourses = useMemo(() => {
		if (activeCategory === "__dashboard__") return [];
		return courses.filter((c) => {
			const categories = Array.isArray(c.category) ? c.category : [c.category];
			return categories.includes(activeCategory);
		});
	}, [courses, activeCategory]);

	if (isLoading) {
		return (
			<div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
				Loading courses...
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Hamburger — mobile only */}
			<button
				onClick={() => setMobileSidebarOpen(true)}
				className="fixed bottom-5 right-5 sm:hidden p-3 bg-foreground text-background rounded-full shadow-lg hover:bg-foreground/90 transition-all z-50"
				aria-label="Menu"
			>
				<Menu className="w-5 h-5" />
			</button>

			<div className="flex flex-1 min-h-0 overflow-hidden">
				<CourseSidebar
					categories={categories}
					courses={courses}
					activeCategory={activeCategory}
					onSelect={setActiveCategory}
					onAddCourse={() => setShowAddModal(true)}
					mobileOpen={mobileSidebarOpen}
					onMobileClose={() => setMobileSidebarOpen(false)}
					search={search}
					setSearch={setSearch}
					onCategoryContextMenu={handleCategoryContextMenu}
					onCategoryMouseDown={handleCategoryMouseDown}
					onCategoryMouseUp={handleCategoryMouseUp}
				/>

				{/* Main content */}
				<div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
					<div className="flex-1 min-h-0 overflow-y-auto">
						{activeCategory === "__dashboard__" ? (
							<DashboardView
								courses={courses}
								search={debouncedSearch}
								onCourseClick={(c) => setSelectedCourseId(c.id)}
							/>
						) : (
							<CategoryView
								category={activeCategory}
								courses={categoryCourses}
								search={debouncedSearch}
								onCourseClick={(c) => setSelectedCourseId(c.id)}
							/>
						)}
					</div>
				</div>
			</div>

			{selectedCourse && (
				<CourseModal
					course={selectedCourse}
					onClose={() => setSelectedCourseId(null)}
					onUpdate={handleUpdate}
					onDelete={async (id) => {
						setSelectedCourseId(null);
						await handleDelete(id);
					}}
					onStatusChange={handleStatusChange}
					allCategories={categories}
				/>
			)}

			{showAddModal && (
				<AddCourseModal
					onClose={() => setShowAddModal(false)}
					onAdd={handleAdd}
					categories={categories}
				/>
			)}

			{categoryMenu && (
				<div
					className="fixed flex flex-col z-50 bg-popover border border-border rounded-xl shadow-lg w-fit"
					style={{ top: categoryMenu.y, left: categoryMenu.x }}
					onClick={(e) => e.stopPropagation()}
				>
					<button
						className="text-left px-4 py-2 text-sm hover:bg-accent transition-colors"
						onClick={() => {
							setEditingCategory(categoryMenu.category);
							setCategoryMenu(null);
						}}
					>
						<span className="flex">
							<Edit className="w-4 h-4 shrink-0 mr-2" /> Edit Category
						</span>
					</button>
					<button
						className="text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
						onClick={() => {
							handleDeleteCategory(categoryMenu.category);
							setCategoryMenu(null);
						}}
					>
						<span className="flex">
							<Trash2 className="w-4 h-4 shrink-0 mr-2" /> Delete It
						</span>
					</button>
				</div>
			)}

			{editingCategory && (
				<EditCategoryModal
					category={editingCategory}
					onClose={() => setEditingCategory(null)}
					onSave={(name) => handleUpdateCategory(editingCategory, name)}
				/>
			)}
		</div>
	);
}
