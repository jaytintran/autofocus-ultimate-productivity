"use client";

import { useState, useRef, useEffect } from "react";
import {
	ChevronLeft,
	ChevronRight,
	FunnelPlus,
	LibraryBig,
	BookOpen,
	GraduationCap,
	FolderKanban,
	Lightbulb,
	NotebookPen,
	Inbox,
	Search,
	X,
	Trophy,
	RefreshCw,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";

import Link from "next/link";
import * as Tooltip from "@radix-ui/react-tooltip";
import { TAG_DEFINITIONS } from "@/lib/tags";
import type { Pamphlet } from "@/lib/types";
import { PAMPHLET_COLORS } from "@/lib/pamphlet-colors";

const NOTION_PAGES = [
	{
		label: "Books",
		description: "Reading list & notes",
		icon: BookOpen,
		href: "notion://www.notion.so/323a0f71b10280f4b891e34fdf76be6a?v=326a0f71b102802d9817000c2d2af7a8&source=copy_link",
	},
	{
		label: "Courses",
		description: "Active & planned learning",
		icon: GraduationCap,
		href: "notion://www.notion.so/31fa0f71b102805aacf9ca86c3b8f38f?v=326a0f71b102802d9817000c2d2af7a8&source=copy_link",
	},
	{
		label: "Projects",
		description: "Ongoing work & ideas",
		icon: FolderKanban,
		href: "notion://www.notion.so/31fa0f71b10280309f09d1bea29c86d9?v=31fa0f71b102804ca34a000cff172a17&source=copy_link",
	},
	{
		label: "Habits",
		description: "Daily routines & habits",
		icon: FunnelPlus,
		href: "https://www.notion.so/326a0f71b102807cbb3ed7de5007a8aa?v=31fa0f71b102804ca34a000cff172a17&source=copy_link",
	},
	{
		label: "Ideas",
		description: "Sparks worth revisiting",
		icon: Lightbulb,
		href: "notion://www.notion.so/31fa0f71b1028098815dccf9c6ceb0ac?v=326a0f71b102802d9817000c2d2af7a8&source=copy_link",
	},
	{
		label: "Notes",
		description: "Things that matter most",
		icon: NotebookPen,
		href: "notion://www.notion.so/Notes-323a0f71b10280a893bfe4de2bd30836?source=copy_link",
	},
];

const THOUGHTS_CAPTURER = NOTION_PAGES[0];

function SecondBrainButton() {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open]);

	return (
		<Tooltip.Provider>
			<div ref={containerRef} className="relative">
				{open && (
					<div className="absolute right-5 top-full mb-2 w-64 bg-card border border-border rounded-2xl shadow-xl p-4 z-50">
						<p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
							Not sure what to work on? Browse your Second Brain for
							inspiration.
						</p>
						<div className="border-t border-border mb-3" />
						<div className="flex flex-col gap-1">
							{NOTION_PAGES.map((page) => {
								const Icon = page.icon;
								return (
									<Link
										key={page.label}
										href={page.href}
										onClick={() => setOpen(false)}
										className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent transition-colors group"
									>
										<div className="p-1.5 rounded-md bg-[#8b9a6b]/10 group-hover:bg-[#8b9a6b]/20 transition-colors shrink-0">
											<Icon className="w-3.5 h-3.5 text-[#8b9a6b]" />
										</div>
										<div className="min-w-0">
											<p className="text-sm font-medium text-foreground leading-none mb-0.5">
												{page.label}
											</p>
											<p className="text-[11px] text-muted-foreground truncate">
												{page.description}
											</p>
										</div>
									</Link>
								);
							})}
						</div>
					</div>
				)}
				<div className="flex gap-2">
					<Tooltip.Root>
						<Tooltip.Trigger asChild>
							<Link href={THOUGHTS_CAPTURER.href}>
								<button className="text-xs border border-border rounded-full p-1.75 transition-colors text-muted-foreground hover:text-foreground hover:bg-accent">
									<Inbox className="w-4 h-4" />
								</button>
							</Link>
						</Tooltip.Trigger>
						<Tooltip.Portal>
							<Tooltip.Content
								side="top"
								className="bg-foreground text-background text-xs px-2 py-1 rounded-md shadow-md"
							>
								Open Thoughts Capturer
								<Tooltip.Arrow className="fill-foreground" />
							</Tooltip.Content>
						</Tooltip.Portal>
					</Tooltip.Root>

					<Tooltip.Root>
						<Tooltip.Trigger asChild>
							<button
								type="button"
								onClick={() => setOpen((prev) => !prev)}
								className={`text-xs border border-border rounded-full p-1.75 transition-colors
									${
										open
											? "text-[#8b9a6b] bg-[#8b9a6b]/10 border-[#8b9a6b]/40"
											: "text-muted-foreground hover:text-foreground hover:bg-accent"
									}`}
							>
								<LibraryBig className="w-4 h-4" />
							</button>
						</Tooltip.Trigger>
						<Tooltip.Portal>
							<Tooltip.Content
								side="top"
								className="bg-foreground text-background text-xs px-2 py-1 rounded-md shadow-md"
							>
								Open Second Brain
								<Tooltip.Arrow className="fill-foreground" />
							</Tooltip.Content>
						</Tooltip.Portal>
					</Tooltip.Root>
				</div>
			</div>
		</Tooltip.Provider>
	);
}

interface PageNavProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	isFiltered?: boolean;
	searchQuery: string;
	onSearchChange: (q: string) => void;
	totalActiveTasks: number;
	taskTagCounts: Record<string, number>;
	completedTasksWithNotes: Array<{
		text: string;
		note: string;
		completed_at: string;
		pamphlet_id: string | null;
	}>;
	onRefreshAchievements: () => void;
	pamphlets: Pamphlet[];
}

export function PageNav({
	currentPage,
	totalPages,
	onPageChange,
	isFiltered = false,
	searchQuery,
	onSearchChange,
	totalActiveTasks,
	taskTagCounts,
	completedTasksWithNotes,
	onRefreshAchievements,
	pamphlets,
}: PageNavProps) {
	const [searchOpen, setSearchOpen] = useState(false);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const [achievementsOpen, setAchievementsOpen] = useState(false);

	useEffect(() => {
		if (searchOpen) {
			searchInputRef.current?.focus();
		} else {
			onSearchChange("");
		}
	}, [searchOpen]);

	return (
		<div className="border-b border-border">
			{/* Mobile: two rows stacked */}
			<div className="flex flex-row sm:flex-row sm:items-center justify-between px-4 py-2 gap-1 sm:gap-0">
				{/* Left side — page nav + stats inline on desktop */}
				<div className="flex items-center justify-between gap-3">
					{/* Page navigation */}
					<div className="flex items-center gap-2">
						<button
							onClick={() => onPageChange(currentPage - 1)}
							disabled={currentPage <= 1}
							className="p-1 hover:bg-accent rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
							aria-label="Previous page"
						>
							<ChevronLeft className="w-4.5 h-4.5" />
						</button>
						<span className="text-sm text-muted-foreground flex items-center gap-2">
							{currentPage} of {totalPages}
							{isFiltered && (
								<FunnelPlus className="w-6 h-6 border border-transparent p-1" />
							)}
						</span>
						<button
							onClick={() => onPageChange(currentPage + 1)}
							disabled={currentPage >= totalPages}
							className="p-1 hover:bg-accent rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
							aria-label="Next page"
						>
							<ChevronRight className="w-4.5 h-4.5" />
						</button>
					</div>

					{/* Stats — inline on desktop, hidden here on mobile (shown below) */}
					<div className="hidden sm:flex items-center gap-3">
						<div className="w-px h-3 bg-border shrink-0" />
						<span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
							{totalActiveTasks} tasks
						</span>
						<div className="w-px h-3 bg-border shrink-0" />
						{TAG_DEFINITIONS.map((tag) => {
							const count = taskTagCounts[tag.id] ?? 0;
							return (
								<span
									key={tag.id}
									className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0 flex items-center gap-1"
								>
									<span>{tag.emoji}</span>
									<span>{count}</span>
								</span>
							);
						})}
						<div className="w-px h-3 bg-border shrink-0" />
						<span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
							🏷️ {taskTagCounts.none ?? 0} untagged
						</span>
					</div>
				</div>

				{/* Right side — search + second brain */}
				<div className="flex items-center gap-2">
					{searchOpen ? (
						<div className="flex items-center gap-1 bg-secondary rounded-full px-3 py-1">
							<Search className="w-3 h-3 mr-1 text-muted-foreground shrink-0" />
							<input
								ref={searchInputRef}
								type="text"
								value={searchQuery}
								onChange={(e) => onSearchChange(e.target.value)}
								placeholder="Search tasks..."
								className="bg-transparent py-1 border-none outline-none text-xs w-36 text-foreground placeholder:text-muted-foreground"
							/>
							<button
								onClick={() => setSearchOpen(false)}
								className="text-muted-foreground hover:text-foreground transition-colors"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						</div>
					) : (
						<button
							onClick={() => setSearchOpen(true)}
							className="text-xs border border-border rounded-full p-1.75 transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
							title="Search tasks"
						>
							<Search className="w-4 h-4" />
						</button>
					)}

					{/* Achievements Button */}
					<Tooltip.Provider>
						<Tooltip.Root>
							<Tooltip.Trigger asChild>
								<button
									onClick={() => setAchievementsOpen(true)}
									className="text-xs border border-border rounded-full p-1.75 transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
								>
									<Trophy className="w-4 h-4" />
								</button>
							</Tooltip.Trigger>
							<Tooltip.Portal>
								<Tooltip.Content
									side="top"
									className="bg-foreground text-background text-xs px-2 py-1 rounded-md shadow-md"
								>
									Your Achievements
									<Tooltip.Arrow className="fill-foreground" />
								</Tooltip.Content>
							</Tooltip.Portal>
						</Tooltip.Root>
					</Tooltip.Provider>

					<SecondBrainButton />
				</div>
			</div>

			{/* Stats row — mobile only */}
			<div className="flex sm:hidden ml-1 items-center justify-left gap-3 px-4 py-1.5 overflow-x-auto border-border/50">
				<span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
					{totalActiveTasks} tasks
				</span>
				<div className="w-px h-3 bg-border shrink-0" />
				{TAG_DEFINITIONS.map((tag) => {
					const count = taskTagCounts[tag.id] ?? 0;
					return (
						<span
							key={tag.id}
							className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0 flex items-center gap-1"
						>
							<span>{tag.emoji}</span>
							<span>{count}</span>
						</span>
					);
				})}
				<div className="w-px h-3 bg-border shrink-0" />
				<span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
					🏷️ {taskTagCounts.none ?? 0} untagged
				</span>
			</div>

			{achievementsOpen && (
				<Dialog open={achievementsOpen} onOpenChange={setAchievementsOpen}>
					<DialogContent className="sm:max-w-[760px] h-[75vh] flex flex-col overflow-hidden">
						<DialogHeader className="flex-shrink-0 border-b pb-4">
							<DialogTitle>Your Achievements 🏆</DialogTitle>
							<DialogDescription>
								Look how much you've done. Be proud.
							</DialogDescription>
						</DialogHeader>

						{/* Refresh button — top right area, before DialogContent closes */}
						<div className="absolute top-4 right-10">
							<button
								onClick={onRefreshAchievements}
								className="absolute text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-accent top-[-2px] right-[1px]"
								title="Refresh"
							>
								<RefreshCw className="w-3 h-3" />
							</button>
						</div>

						<div
							className="flex-1 min-h-0 overflow-y-auto mt-4 pr-1 flex flex-col gap-3"
							style={{ scrollbarWidth: "thin" }}
						>
							{completedTasksWithNotes.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-8">
									No achievements yet. Complete a task and add a note!
								</p>
							) : (
								completedTasksWithNotes.map((task, i) => {
									const date = new Date(task.completed_at);
									const pamphlet =
										pamphlets.find((p) => p.id === task.pamphlet_id) ?? null;
									return (
										<div
											key={i}
											className="flex flex-col gap-0.5 py-2 border-b border-border/50 last:border-0"
										>
											<p className="text-sm font-medium text-foreground leading-snug">
												{task.note}
											</p>
											<p className="text-[11px] text-muted-foreground">
												<span className="underline">From the task</span> :{" "}
												{task.text}
											</p>
											<div className="flex items-center gap-2 mt-0.5">
												<p className="text-[11px] text-muted-foreground/60">
													{date.toLocaleDateString(undefined, {
														weekday: "short",
														year: "numeric",
														month: "short",
														day: "numeric",
													})}
													{" · "}
													{date.toLocaleTimeString(undefined, {
														hour: "2-digit",
														minute: "2-digit",
													})}
												</p>
												{pamphlet && (
													<>
														<span className="text-muted-foreground/40 text-[11px]">
															·
														</span>
														<span
															className={`text-[11px] font-medium ${PAMPHLET_COLORS[pamphlet.color].text}`}
														>
															{pamphlet.name}
														</span>
													</>
												)}
											</div>
										</div>
									);
								})
							)}
						</div>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
