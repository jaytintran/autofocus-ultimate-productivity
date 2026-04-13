"use client";

import { useState, useEffect, useRef } from "react";
import type { Project } from "@/lib/db/projects";
import {
	Search,
	Plus,
	X,
	LayoutDashboard,
	ChevronRight,
	Menu,
} from "lucide-react";
import { getCategoryIcon } from "./utils";

export function ProjectSidebar({
	categories,
	projects,
	activeCategory,
	onSelect,
	onAddProject,
	collapsed,
	onToggleCollapse,
	mobileOpen,
	onMobileClose,
	search,
	setSearch,
	onCategoryContextMenu,
	onCategoryMouseDown,
	onCategoryMouseUp,
}: {
	categories: string[];
	projects: Project[];
	activeCategory: string;
	onSelect: (c: string) => void;
	onAddProject: () => void;
	collapsed: boolean;
	onToggleCollapse: () => void;
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
		if (addingCategory) newCategoryInputRef.current?.focus();
	}, [addingCategory]);

	const handleNewCategorySubmit = () => {
		const name = newCategoryName.trim();
		if (!name) {
			setAddingCategory(false);
			return;
		}
		onSelect(name);
		setNewCategoryName("");
		setAddingCategory(false);
	};

	const NavItems = ({
		forcedExpanded = false,
	}: {
		forcedExpanded?: boolean;
	}) => {
		const isCollapsed = !forcedExpanded && collapsed;
		return (
			<>
				{/* Overview */}
				<button
					onClick={() => {
						onSelect("__dashboard__");
						onMobileClose();
					}}
					title="Overview"
					className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors
            			${activeCategory === "__dashboard__" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground"}
            			${isCollapsed ? "justify-center" : ""}`}
				>
					<LayoutDashboard className="w-4 h-4 flex-shrink-0" />
					{!isCollapsed && (
						<span className="truncate flex-1 text-left">Overview</span>
					)}
				</button>

				<div className="h-px bg-border/40 my-1 mx-1" />

				{/* Category rows */}
				{categories.map((cat) => {
					const count = projects.filter((p) => p.category === cat).length;
					const isActive = activeCategory === cat;
					const Icon = getCategoryIcon(cat);
					return (
						<button
							key={cat}
							onClick={() => {
								onSelect(cat);
								onMobileClose();
							}}
							onMouseDown={(e) => onCategoryMouseDown(e, cat)}
							onMouseUp={onCategoryMouseUp}
							onMouseLeave={onCategoryMouseUp}
							onContextMenu={(e) => onCategoryContextMenu(e, cat)}
							title={cat}
							className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors group relative
                			${isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground"}
                			${isCollapsed ? "justify-center" : ""}`}
						>
							<Icon className="w-4 h-4 flex-shrink-0" />
							{!isCollapsed && (
								<>
									<span className="truncate flex-1 text-left text-sm">
										{cat}
									</span>
									<span
										className={`text-[10px] tabular-nums ml-auto flex-shrink-0 ${isActive ? "opacity-70" : "opacity-40"}`}
									>
										{count}
									</span>
								</>
							)}
							{isCollapsed && (
								<span className="absolute -top-1 -right-1 text-[9px] bg-muted text-muted-foreground rounded-full w-4 h-4 flex items-center justify-center leading-none">
									{count}
								</span>
							)}
						</button>
					);
				})}

				<div className="h-px bg-border/40 my-1 mx-1" />

				{/* Inline new category input */}
				{addingCategory && !isCollapsed && (
					<div className="px-2 py-1">
						<input
							ref={newCategoryInputRef}
							value={newCategoryName}
							onChange={(e) => setNewCategoryName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleNewCategorySubmit();
								if (e.key === "Escape") {
									setAddingCategory(false);
									setNewCategoryName("");
								}
							}}
							onBlur={handleNewCategorySubmit}
							placeholder="Category name..."
							className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
						/>
					</div>
				)}

				{/* Add project */}
				<button
					onClick={onAddProject}
					title="Add Project"
					className={`mt-2 flex items-center px-2 py-3 justify-center gap-1 rounded-lg text-xs font-medium bg-[#8b9a6b]/10 hover:bg-[#8b9a6b]/20 text-[#8b9a6b] transition-colors
            ${isCollapsed ? "w-8 h-8" : "w-full"}`}
				>
					<Plus className="w-3.5 h-3.5 flex-shrink-0" />
					{!isCollapsed && <span>Add Project</span>}
				</button>
			</>
		);
	};

	return (
		<>
			{/* Desktop sidebar */}
			<div className="hidden sm:flex h-full flex-shrink-0 sticky top-0">
				<div
					className={`flex flex-col h-full bg-card border-r border-border/50 transition-all duration-200 ${collapsed ? "w-14" : "w-fit"}`}
				>
					{/* Search */}
					<div
						className={`flex-shrink-0 border-b border-border/50 ${collapsed ? "flex justify-center px-2 py-2" : "px-2 py-2"}`}
					>
						{collapsed ? (
							<button
								onClick={onToggleCollapse}
								title="Expand to search"
								className="p-2 rounded-lg hover:bg-accent text-muted-foreground/50 hover:text-foreground transition-colors"
							>
								<Search className="w-4 h-4" />
							</button>
						) : (
							<div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-2.5 py-1.5">
								<Search className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
								<input
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search..."
									className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/30 min-w-0 w-32"
								/>
								{search && (
									<button
										onClick={() => setSearch("")}
										className="text-muted-foreground/40 hover:text-foreground transition-colors flex-shrink-0"
									>
										<X className="w-3 h-3" />
									</button>
								)}

								<button
									onClick={onToggleCollapse}
									className="p-1 rounded-md hover:bg-accent text-muted-foreground/60 hover:text-foreground transition-colors"
								>
									<ChevronRight
										className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`}
									/>
								</button>
							</div>
						)}
					</div>

					{/* Nav */}
					<div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2 min-h-0">
						<NavItems />
					</div>
				</div>
			</div>

			{/* Mobile drawer */}
			{mobileOpen && (
				<>
					<div
						className="fixed inset-0 z-40 bg-black/40 sm:hidden"
						onClick={onMobileClose}
					/>
					<div className="fixed inset-y-0 left-0 z-50 sm:hidden">
						<div className="flex flex-col h-full w-64 bg-card border-r border-border/50">
							<div className="flex items-center justify-between px-3 py-3 border-b border-border/50 flex-shrink-0">
								<span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
									Projects
								</span>
								<button
									onClick={onMobileClose}
									className="p-1 rounded-md hover:bg-accent text-muted-foreground/60"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
							<div className="flex-shrink-0 px-2 py-2 border-b border-border/50">
								<div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-2.5 py-1.5">
									<Search className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
									<input
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										placeholder="Search..."
										className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/30"
									/>
									{search && (
										<button
											onClick={() => setSearch("")}
											className="text-muted-foreground/40 hover:text-foreground"
										>
											<X className="w-3 h-3" />
										</button>
									)}
								</div>
							</div>
							<div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
								<NavItems forcedExpanded />
							</div>
						</div>
					</div>
				</>
			)}
		</>
	);
}
