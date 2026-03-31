"use client";

import { useState } from "react";
import type {
	ContentFilterOption,
	ContentFilterPreset,
	ContentFilterState,
} from "@/lib/content-filter";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface ContentFilterBarProps {
	value: ContentFilterState;
	onChange: (value: ContentFilterState) => void;
}

const FILTER_OPTIONS: { label: string; value: ContentFilterOption }[] = [
	{ label: "Courses", value: "courses" },
	{ label: "Projects", value: "projects" },
	{ label: "Books", value: "books" },
];

const PRESET_OPTIONS: { label: string; value: ContentFilterPreset }[] = [
	{ label: "Show All", value: "show-all" },
	{ label: "Exclude All", value: "exclude-all" },
];

export function ContentFilterBar({ value, onChange }: ContentFilterBarProps) {
	const [open, setOpen] = useState(false);

	const getSelectedLabels = () => {
		if (value.preset === "show-all") return "All";
		if (value.preset === "exclude-all") return "➖";

		if (value.options.length === 0) return "All";
		if (value.options.length === FILTER_OPTIONS.length) return "All";

		return `${value.options.length} / ${FILTER_OPTIONS.length}`;
	};

	const toggleOption = (option: ContentFilterOption) => {
		const newOptions = value.options.includes(option)
			? value.options.filter((o) => o !== option)
			: [...value.options, option];

		onChange({ options: newOptions, preset: undefined });
	};

	const setPreset = (preset: ContentFilterPreset) => {
		onChange({ options: [], preset });
		setOpen(false);
	};

	return (
		<div>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button variant="outline" size="sm" className="h-8 rounded">
						<span className="text-sm">{getSelectedLabels()}</span>
						<ChevronDown
							className={`w-3 h-3 opacity-50 transition-transform ${open ? "rotate-180" : ""}`}
						/>
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-48 p-2" align="end">
					<div className="flex flex-col gap-1">
						{/* Preset Options */}
						{PRESET_OPTIONS.map((preset) => (
							<button
								key={preset.value}
								onClick={() => setPreset(preset.value)}
								className={`
									w-full text-left py-2 px-3 text-sm rounded hover:bg-accent transition-colors text-left
									${
										value.preset === preset.value
											? "bg-accent text-accent-foreground"
											: "text-muted-foreground hover:text-foreground"
									}
								`}
							>
								{preset.label}
							</button>
						))}

						{/* Divider */}
						<div className="border-t my-1" />

						{/* Multi-select Options */}
						{FILTER_OPTIONS.map((option) => {
							const isSelected = value.options.includes(option.value);
							return (
								<button
									key={option.value}
									onClick={() => toggleOption(option.value)}
									className={`
										w-full text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors flex items-center gap-2
										${
											isSelected
												? "bg-[#8b9a6b]/15 text-[#8b9a6b]"
												: "text-muted-foreground hover:text-foreground"
										}
									`}
								>
									<div
										className={`
										w-3 h-3 rounded border flex items-center justify-center
										${isSelected ? "bg-[#8b9a6b] border-[#8b9a6b]" : "border-muted-foreground"}
									`}
									>
										{isSelected && (
											<svg
												className="w-2.5 h-2.5 text-white"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={3}
													d="M5 13l4 4L19 7"
												/>
											</svg>
										)}
									</div>
									{option.label}
								</button>
							);
						})}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
