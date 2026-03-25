"use client";

import type { ContentFilterOption } from "@/lib/content-filter";

interface ContentFilterBarProps {
	value: ContentFilterOption;
	onChange: (value: ContentFilterOption) => void;
}

const OPTIONS: { label: string; value: ContentFilterOption }[] = [
	{ label: "Default", value: "default" },
	{ label: "Courses", value: "courses" },
	{ label: "Projects", value: "projects" },
	{ label: "Both", value: "both" },
	{ label: "Hide Both", value: "hide-both" },
];

export function ContentFilterBar({ value, onChange }: ContentFilterBarProps) {
	return (
		<div
			role="group"
			aria-label="Content filter"
			className="flex items-center gap-0.5 px-3 py-1.5 border-b pl-4 sm:pl-5 border-border bg-background/80 overflow-x-auto no-scrollbar"
		>
			<span className="text-[10px] max-sm:hidden font-medium text-muted-foreground/60 uppercase tracking-wider pr-2 shrink-0 select-none">
				See By
			</span>
			{OPTIONS.map((opt) => {
				const isActive = value === opt.value;
				return (
					<button
						key={opt.value}
						onClick={() => onChange(opt.value)}
						className={`
							shrink-0 px-2.5 py-1 rounded text-xs font-medium transition-all duration-100
							${
								isActive
									? "bg-[#8b9a6b]/15 text-[#8b9a6b] border border-[#8b9a6b]/30"
									: "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent"
							}
						`}
					>
						{opt.label}
					</button>
				);
			})}
		</div>
	);
}
