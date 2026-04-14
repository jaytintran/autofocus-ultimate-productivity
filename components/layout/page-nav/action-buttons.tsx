"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Calendar, Flame } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

interface ActionButtonsProps {
	searchQuery: string;
	onSearchChange: (q: string) => void;
	scheduleViewActive: boolean;
	onToggleScheduleView: () => void;
	habitsViewActive: boolean;
	onToggleHabitsView: () => void;
	activeHabitCount: number;
}

export function ActionButtons({
	searchQuery,
	onSearchChange,
	scheduleViewActive,
	onToggleScheduleView,
	habitsViewActive,
	onToggleHabitsView,
	activeHabitCount,
}: ActionButtonsProps) {
	const [searchOpen, setSearchOpen] = useState(false);
	const searchInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (searchOpen) {
			searchInputRef.current?.focus();
		} else {
			onSearchChange("");
		}
	}, [searchOpen, onSearchChange]);

	return (
		<div className="flex items-center gap-2">
			{/* Search Button*/}
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

			{/* Schedule Button */}
			<Tooltip.Provider>
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						<button
							onClick={onToggleScheduleView}
							className={`text-xs border rounded-full p-1.75 transition-colors
						${
							scheduleViewActive
								? "border-[#8b9a6b]/40 bg-[#8b9a6b]/10 text-[#8b9a6b]"
								: "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
						}`}
						>
							<Calendar className="w-4 h-4" />
						</button>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content
							side="top"
							className="bg-foreground text-background text-xs px-2 py-1 rounded-md shadow-md"
						>
							Schedule
							<Tooltip.Arrow className="fill-foreground" />
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
			</Tooltip.Provider>

			{/* Habits Button */}
			<Tooltip.Provider>
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						<button
							onClick={onToggleHabitsView}
							className={`relative text-xs border rounded-full p-1.75 transition-colors
        						${
											habitsViewActive
												? "border-amber-500/40 bg-amber-500/10 text-amber-500"
												: "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
										}`}
						>
							<Flame className="w-4 h-4" />
							{activeHabitCount > 0 && (
								<span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white leading-none">
									{activeHabitCount}
								</span>
							)}
						</button>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content
							side="top"
							className="bg-foreground text-background text-xs px-2 py-1 rounded-md shadow-md"
						>
							Today's Habits
							<Tooltip.Arrow className="fill-foreground" />
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
			</Tooltip.Provider>
		</div>
	);
}
