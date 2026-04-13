"use client";

import { useState, useMemo, useEffect } from "react";
import { useHabits } from "@/hooks/data/use-habits";
import { Menu } from "lucide-react";
import { CATEGORY_ORDER } from "./constants";
import { HabitModal } from "./habit-modal";
import { AddHabitModal } from "./add-habit-modal";
import { DashboardView } from "./dashboard-view";
import { CategoryView } from "./category-view";
import { HabitSidebar } from "./habit-sidebar";

export function HabitView() {
	const {
		habits,
		isLoading,
		handleUpdate,
		handleAdd,
		handleDelete,
		handleToggleToday,
		handleToggleDate,
		handleReorder,
	} = useHabits();

	const [activeCategory, setActiveCategory] = useState("__dashboard__");
	const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

	useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(search), 300);
		return () => clearTimeout(t);
	}, [search]);

	const selectedHabit = useMemo(
		() => habits.find((h) => h.id === selectedHabitId) ?? null,
		[habits, selectedHabitId],
	);

	// Categories sorted by CATEGORY_ORDER
	const categories = useMemo(() => {
		const existing = Array.from(new Set(habits.map((h) => h.category)));
		return existing.sort((a, b) => {
			const indexA = CATEGORY_ORDER.indexOf(a.toLowerCase());
			const indexB = CATEGORY_ORDER.indexOf(b.toLowerCase());
			if (indexA === -1 && indexB === -1) return a.localeCompare(b);
			if (indexA === -1) return 1;
			if (indexB === -1) return -1;
			return indexA - indexB;
		});
	}, [habits]);

	const categoryHabits = useMemo(() => {
		if (activeCategory === "__dashboard__") return [];
		return habits.filter((h) => h.category === activeCategory);
	}, [habits, activeCategory]);

	if (isLoading) {
		return (
			<div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
				Loading habits...
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
				<HabitSidebar
					categories={categories}
					habits={habits}
					activeCategory={activeCategory}
					onSelect={setActiveCategory}
					onAddHabit={() => setShowAddModal(true)}
					collapsed={sidebarCollapsed}
					onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
					mobileOpen={mobileSidebarOpen}
					onMobileClose={() => setMobileSidebarOpen(false)}
					search={search}
					setSearch={setSearch}
				/>

				{/* Main content */}
				<div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
					<div className="flex-1 min-h-0 overflow-y-auto">
						{activeCategory === "__dashboard__" ? (
							<DashboardView
								habits={habits}
								search={debouncedSearch}
								onHabitClick={(h) => setSelectedHabitId(h.id)}
								onToggleToday={handleToggleToday}
								onToggleDate={handleToggleDate}
								onReorder={handleReorder}
							/>
						) : (
							<CategoryView
								category={activeCategory}
								habits={categoryHabits}
								search={debouncedSearch}
								onHabitClick={(h) => setSelectedHabitId(h.id)}
								onToggleToday={handleToggleToday}
								onToggleDate={handleToggleDate}
								onReorder={handleReorder}
							/>
						)}
					</div>
				</div>
			</div>

			{selectedHabit && (
				<HabitModal
					habit={selectedHabit}
					onClose={() => setSelectedHabitId(null)}
					onUpdate={handleUpdate}
					onDelete={async (id) => {
						setSelectedHabitId(null);
						await handleDelete(id);
					}}
					onToggleToday={() => handleToggleToday(selectedHabit.id)}
				/>
			)}

			{showAddModal && (
				<AddHabitModal
					onClose={() => setShowAddModal(false)}
					onAdd={handleAdd}
					categories={categories}
				/>
			)}
		</div>
	);
}
