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
} from "lucide-react";
import Link from "next/link";
import * as Tooltip from "@radix-ui/react-tooltip";

const NOTION_PAGES = [
	{
		label: "Received Thoughts",
		description: "Capturing thoughts & flashes",
		icon: Inbox,
		href: "notion://www.notion.so/32aa0f71b1028092ba0dc76db7752f9d?v=32aa0f71b1028009a540000cff473e9e&source=copy_link",
	},
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

// Thoughts Capturer is always the first entry
const THOUGHTS_CAPTURER = NOTION_PAGES[0];

function SecondBrainButton() {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// Close when clicking outside
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
				{/* Picker Panel */}
				{open && (
					<div className="absolute right-10 -bottom-[calc(100%+200px)] mb-2 w-64 bg-card border border-border rounded-2xl shadow-xl p-4 z-50">
						{/* Description */}
						<p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
							Not sure what to work on? Browse your Second Brain for
							inspiration.
						</p>

						{/* Divider */}
						<div className="border-t border-border mb-3" />

						{/* Notion page links */}
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
										<div className="p-1.5 rounded-md bg-[#8b9a6b]/10 group-hover:bg-[#8b9a6b]/20 transition-colors flex-shrink-0">
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

				{/* Buttons row */}
				<div className="flex gap-2">
					{/* Thoughts Capturer — sourced from NOTION_PAGES[0] */}
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

					{/* Second Brain Picker */}
					<Tooltip.Root>
						<Tooltip.Trigger asChild>
							<button
								type="button"
								onClick={() => setOpen((prev) => !prev)}
								className={`
									text-xs border border-border rounded-full p-1.75 transition-colors
									${
										open
											? "text-[#8b9a6b] bg-[#8b9a6b]/10 border-[#8b9a6b]/40"
											: "text-muted-foreground hover:text-foreground hover:bg-accent"
									}
								`}
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
}

export function PageNav({
	currentPage,
	totalPages,
	onPageChange,
	isFiltered = false,
}: PageNavProps) {
	return (
		<div className="flex items-center justify-between px-4 py-2 border-b">
			{/* Left side — page navigation */}
			<div className="flex items-center gap-2 mt-1">
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

			{/* Right side — Second Brain button */}
			<SecondBrainButton />
		</div>
	);
}
