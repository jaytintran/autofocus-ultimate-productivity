"use client";

import { useState, useRef, useEffect } from "react";
import {
	Compass,
	BookOpen,
	GraduationCap,
	FolderKanban,
	Lightbulb,
	NotebookPen,
	Trophy,
	Inbox,
} from "lucide-react";
import Link from "next/link";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AchievementsModal } from "./achievements-modal";
import type { CompassButtonProps } from "./types";

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
		icon: Inbox,
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

export function CompassButton({
	completedTasksWithNotes,
	onRefreshAchievements,
	pamphlets,
}: CompassButtonProps) {
	const [open, setOpen] = useState(false);
	const [achievementsOpen, setAchievementsOpen] = useState(false);
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
		<div ref={containerRef} className="relative">
			{open && (
				<div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-2xl shadow-xl p-4 z-50 flex flex-col gap-4">
					{/* Achievements section */}
					<div className="flex flex-col gap-1">
						<p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium px-1">
							Achievements
						</p>
						<button
							onClick={() => {
								setOpen(false);
								setAchievementsOpen(true);
							}}
							className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent transition-colors text-left"
						>
							<div className="p-1.5 rounded-md bg-amber-500/10 shrink-0">
								<Trophy className="w-3.5 h-3.5 text-amber-500" />
							</div>
							<div className="min-w-0">
								<p className="text-sm font-medium text-foreground leading-none mb-0.5">
									Your Achievements
								</p>
								<p className="text-[11px] text-muted-foreground">
									Tasks completed with notes
								</p>
							</div>
						</button>
					</div>

					<div className="h-px bg-border" />

					{/* Thoughts capturer */}
					<div className="flex flex-col gap-1">
						<p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium px-1">
							Capture
						</p>
						<Link
							href={NOTION_PAGES[0].href}
							onClick={() => setOpen(false)}
							className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent transition-colors"
						>
							<div className="p-1.5 rounded-md bg-[#8b9a6b]/10 shrink-0">
								<Inbox className="w-3.5 h-3.5 text-[#8b9a6b]" />
							</div>
							<div className="min-w-0">
								<p className="text-sm font-medium text-foreground leading-none mb-0.5">
									Thoughts Capturer
								</p>
								<p className="text-[11px] text-muted-foreground">
									Dump ideas before they vanish
								</p>
							</div>
						</Link>
					</div>

					<div className="h-px bg-border" />

					{/* Second brain links */}
					<div className="flex flex-col gap-1">
						<p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium px-1">
							Second Brain
						</p>
						{NOTION_PAGES.slice(1).map((page) => {
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

			<Tooltip.Provider>
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						<button
							type="button"
							onClick={() => setOpen((prev) => !prev)}
							className={`text-xs border rounded-full p-1.75 transition-colors
                ${
									open
										? "border-[#8b9a6b]/40 bg-[#8b9a6b]/10 text-[#8b9a6b]"
										: "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
								}`}
						>
							<Compass className="w-4 h-4" />
						</button>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content
							side="top"
							className="bg-foreground text-background text-xs px-2 py-1 rounded-md shadow-md"
						>
							Navigate
							<Tooltip.Arrow className="fill-foreground" />
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
			</Tooltip.Provider>

			{/* Achievements modal */}
			<AchievementsModal
				open={achievementsOpen}
				onOpenChange={setAchievementsOpen}
				completedTasksWithNotes={completedTasksWithNotes}
				onRefresh={onRefreshAchievements}
				pamphlets={pamphlets}
			/>
		</div>
	);
}
