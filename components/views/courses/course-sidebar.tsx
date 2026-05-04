"use client";

import { useState, useEffect, useRef } from "react";
import type { Course } from "@/lib/db/courses";
import {
	Search,
	Plus,
	X,
	LayoutDashboard,
	ChevronRight,
	Menu,
} from "lucide-react";
import { getCategoryIcon } from "./utils";

export function CourseSidebar({
	categories,
	courses,
	activeCategory,
	onSelect,
	onAddCourse,
	mobileOpen,
	onMobileClose,
	search,
	setSearch,
	onCategoryContextMenu,
	onCategoryMouseDown,
	onCategoryMouseUp,
}: {
	categories: string[];
	courses: Course[];
	activeCategory: string;
	onSelect: (c: string) => void;
	onAddCourse: () => void;
	mobileOpen: boolean;
	onMobileClose: () => void;
	search: string;
	setSearch: (s: string) => void;
	onCategoryContextMenu: (e: React.MouseEvent, category: string) => void;
	onCategoryMouseDown: (e: React.MouseEvent, category: string) => void;
	onCategoryMouseUp: () => void;
}) {
	const [addingCategory, setAddingCategory] = useState(false);
	const [newCategoryName, setNewCategoryName] = useState("");
	const newCategoryInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (addingCategory && newCategoryInputRef.current) {
			newCategoryInputRef.current.focus();
		}
	}, [addingCategory]);

	const handleAddCategory = () => {
		if (!newCategoryName.trim()) {
			setAddingCategory(false);
			return;
		}
		onSelect(newCategoryName.trim());
		setNewCategoryName("");
		setAddingCategory(false);
	};

	const getCategoryCount = (category: string) => {
		return courses.filter((c) => c.category === category).length;
	};

	const sidebarContent = (
		<>
			{/* Search */}
			<div className="p-4 border-b border-border">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<input
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search courses..."
						className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
					/>
				</div>
			</div>

			{/* Navigation */}
			<div className="flex-1 overflow-y-auto p-4 space-y-1">
				{/* Dashboard */}
				<button
					onClick={() => {
						onSelect("__dashboard__");
						onMobileClose();
					}}
					className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
						activeCategory === "__dashboard__"
							? "bg-accent text-foreground"
							: "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
					}`}
				>
					<LayoutDashboard className="w-4 h-4 flex-shrink-0" />
					<span className="text-sm font-medium">Dashboard</span>
				</button>

				{/* Categories */}
				<div className="pt-4">
					<div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold px-3 mb-2">
						Categories
					</div>
					{categories.map((category) => {
						const Icon = getCategoryIcon(category);
						const count = getCategoryCount(category);
						return (
							<button
								key={category}
								onClick={() => {
									onSelect(category);
									onMobileClose();
								}}
								onContextMenu={(e) => onCategoryContextMenu(e, category)}
								onMouseDown={(e) => onCategoryMouseDown(e, category)}
								onMouseUp={onCategoryMouseUp}
								onTouchStart={(e) =>
									onCategoryMouseDown(
										e as unknown as React.MouseEvent,
										category,
									)
								}
								onTouchEnd={onCategoryMouseUp}
								className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
									activeCategory === category
										? "bg-accent text-foreground"
										: "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
								}`}
							>
								<Icon className="w-4 h-4 flex-shrink-0" />
								<span className="text-sm font-medium flex-1 text-left capitalize">
									{category}
								</span>
								<span className="text-xs text-muted-foreground">{count}</span>
							</button>
						);
					})}

					{/* Add category input */}
					{addingCategory && (
						<div className="px-3 py-2">
							<input
								ref={newCategoryInputRef}
								type="text"
								value={newCategoryName}
								onChange={(e) => setNewCategoryName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleAddCategory();
									if (e.key === "Escape") {
										setAddingCategory(false);
										setNewCategoryName("");
									}
								}}
								onBlur={handleAddCategory}
								placeholder="Category name..."
								className="w-full px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
					)}
				</div>
			</div>

			{/* Footer */}
			<div className="p-4 border-t border-border space-y-2">
				<button
					onClick={onAddCourse}
					className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors text-sm font-medium"
				>
					<Plus className="w-4 h-4" />
					<span>Add Course</span>
				</button>
			</div>
		</>
	);

	return (
		<>
			{/* Desktop sidebar */}
			<div className="hidden sm:flex flex-col border-r border-border bg-background w-64">
				{sidebarContent}
			</div>

			{/* Mobile sidebar */}
			{mobileOpen && (
				<>
					<div
						className="sm:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
						onClick={onMobileClose}
					/>
					<div className="sm:hidden fixed left-0 top-0 bottom-0 w-64 bg-background border-r border-border z-50 flex flex-col">
						<div className="flex items-center justify-between p-4 border-b border-border">
							<h2 className="text-sm font-semibold">Courses</h2>
							<button
								onClick={onMobileClose}
								className="p-1 hover:bg-accent rounded transition-colors"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
						{sidebarContent}
					</div>
				</>
			)}
		</>
	);
}
