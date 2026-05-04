"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

export function MultiSelect({
	value,
	onChange,
	options,
	placeholder = "Select...",
	allowCustom = false,
}: {
	value: string[];
	onChange: (value: string[]) => void;
	options: string[];
	placeholder?: string;
	allowCustom?: boolean;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [customInput, setCustomInput] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleToggle = (option: string) => {
		if (value.includes(option)) {
			onChange(value.filter((v) => v !== option));
		} else {
			onChange([...value, option]);
		}
	};

	const handleRemove = (option: string) => {
		onChange(value.filter((v) => v !== option));
	};

	const handleAddCustom = () => {
		const trimmed = customInput.trim();
		if (trimmed && !value.includes(trimmed)) {
			onChange([...value, trimmed]);
			setCustomInput("");
		}
	};

	const availableOptions = options.filter((opt) => !value.includes(opt));

	return (
		<div ref={containerRef} className="relative">
			{/* Selected tags */}
			<div
				onClick={() => setIsOpen(!isOpen)}
				className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring cursor-pointer min-h-[40px] flex flex-wrap gap-1.5"
			>
				{value.length === 0 ? (
					<span className="text-muted-foreground/40">{placeholder}</span>
				) : (
					value.map((item) => (
						<span
							key={item}
							className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary text-foreground rounded-full text-xs"
						>
							{item}
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handleRemove(item);
								}}
								className="hover:text-destructive transition-colors"
							>
								<X className="w-3 h-3" />
							</button>
						</span>
					))
				)}
			</div>

			{/* Dropdown */}
			{isOpen && (
				<div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
					{availableOptions.length > 0 ? (
						<div className="py-1">
							{availableOptions.map((option) => (
								<button
									key={option}
									type="button"
									onClick={() => handleToggle(option)}
									className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
								>
									{option}
								</button>
							))}
						</div>
					) : (
						<div className="px-3 py-2 text-sm text-muted-foreground">
							No more options available
						</div>
					)}

					{/* Custom input */}
					{allowCustom && (
						<div className="border-t border-border p-2">
							<div className="flex gap-1">
								<input
									type="text"
									value={customInput}
									onChange={(e) => setCustomInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											handleAddCustom();
										}
									}}
									placeholder="Add custom..."
									className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
								/>
								<button
									type="button"
									onClick={handleAddCustom}
									disabled={!customInput.trim()}
									className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs disabled:opacity-50"
								>
									Add
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
