"use client";

import { useState, useEffect, useRef } from "react";
import { parseDueDateShortcut } from "@/lib/utils/due-date-parser";

const PRESETS = [
	{ label: "15m", shortcut: "!15m" },
	{ label: "30m", shortcut: "!30m" },
	{ label: "45m", shortcut: "!45m" },
	{ label: "1h", shortcut: "!1h" },
	{ label: "3h", shortcut: "!3h" },
	{ label: "1d", shortcut: "!1d" },
];

interface DueDatePickerProps {
	currentDueDate: string | null;
	onSet: (isoDate: string | null) => void;
	onClose: () => void;
}

export function DueDatePicker({
	currentDueDate,
	onSet,
	onClose,
}: DueDatePickerProps) {
	const [customInput, setCustomInput] = useState("");
	const [customError, setCustomError] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handler = (e: MouseEvent | TouchEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				onClose();
			}
		};
		document.addEventListener("mousedown", handler);
		document.addEventListener("touchstart", handler);
		return () => {
			document.removeEventListener("mousedown", handler);
			document.removeEventListener("touchstart", handler);
		};
	}, [onClose]);

	const handlePreset = (shortcut: string) => {
		const { dueDate } = parseDueDateShortcut(shortcut);
		if (dueDate) {
			onSet(dueDate.toISOString());
			onClose();
		}
	};

	const handleCustomSubmit = () => {
		const input = customInput.trim();
		const normalized = input.startsWith("!") ? input : `!${input}`;
		const { dueDate } = parseDueDateShortcut(normalized);
		if (dueDate) {
			setCustomError(false);
			onSet(dueDate.toISOString());
			onClose();
		} else {
			setCustomError(true);
			setTimeout(() => setCustomError(false), 1200);
		}
	};

	return (
		<div
			ref={menuRef}
			className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl p-3 w-56 flex flex-col gap-2"
		>
			<div className="grid grid-cols-3 gap-1.5">
				{PRESETS.map((p) => (
					<button
						key={p.label}
						onClick={() => handlePreset(p.shortcut)}
						className="px-2 py-1.5 text-xs rounded-lg border border-border hover:bg-accent hover:border-border/80 transition-colors font-medium"
					>
						{p.label}
					</button>
				))}
			</div>

			<div className="h-px bg-border" />

			<div className="flex gap-1.5">
				<input
					autoFocus
					value={customInput}
					onChange={(e) => setCustomInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") handleCustomSubmit();
						if (e.key === "Escape") onClose();
					}}
					placeholder="e.g. 2h30m or 3d"
					className={`flex-1 bg-background border rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring transition-colors
            ${customError ? "border-destructive" : "border-input"}`}
				/>
				<button
					onClick={handleCustomSubmit}
					className="px-2 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
				>
					Set
				</button>
			</div>

			{currentDueDate && (
				<button
					onClick={() => {
						onSet(null);
						onClose();
					}}
					className="text-[10px] text-destructive hover:text-destructive/80 transition-colors text-left"
				>
					Clear due date
				</button>
			)}
		</div>
	);
}
