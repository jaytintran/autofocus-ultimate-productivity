import { useState, useRef, useEffect } from "react";
import { ChevronRight } from "lucide-react";

export function TagChipSelector({
	domainTags,
	selected,
	onChange,
}: {
	domainTags: string[];
	selected: string[];
	onChange: (tags: string[]) => void;
}) {
	const [showInput, setShowInput] = useState(false);
	const [newTagValue, setNewTagValue] = useState("");
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const newTagInputRef = useRef<HTMLInputElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (showInput) newTagInputRef.current?.focus();
	}, [showInput]);

	useEffect(() => {
		if (!dropdownOpen) return;
		const handler = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [dropdownOpen]);

	const toggle = (tag: string) => {
		onChange(
			selected.includes(tag)
				? selected.filter((t) => t !== tag)
				: [...selected, tag],
		);
	};

	const commitNewTag = () => {
		const val = newTagValue.trim().toLowerCase();
		if (val && !selected.includes(val)) {
			onChange([...selected, val]);
		}
		setNewTagValue("");
		setShowInput(false);
	};

	const allTags = Array.from(new Set([...domainTags, ...selected])).sort();

	return (
		<>
			{/* Desktop: chip selector */}
			<div className="hidden sm:flex flex-wrap gap-1.5">
				{allTags.map((tag) => {
					const active = selected.includes(tag);
					return (
						<button
							key={tag}
							type="button"
							onClick={() => toggle(tag)}
							className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
								active
									? "border-foreground/30 bg-foreground/10 text-foreground"
									: "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
							}`}
						>
							{tag}
						</button>
					);
				})}

				{/* + New tag */}
				{showInput ? (
					<input
						ref={newTagInputRef}
						value={newTagValue}
						onChange={(e) => setNewTagValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								commitNewTag();
							}
							if (e.key === "Escape") {
								setShowInput(false);
								setNewTagValue("");
							}
						}}
						onBlur={commitNewTag}
						placeholder="tag name..."
						className="text-[11px] px-2.5 py-1 rounded-full border border-ring bg-background outline-none w-24"
					/>
				) : (
					<button
						type="button"
						onClick={() => setShowInput(true)}
						className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
					>
						+ New
					</button>
				)}
			</div>

			{/* Mobile: dropdown button */}
			<div className="sm:hidden relative" ref={dropdownRef}>
				<button
					type="button"
					onClick={() => setDropdownOpen(!dropdownOpen)}
					className="w-full flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
				>
					<span className="text-muted-foreground text-xs">
						{selected.length === 0
							? "Select tags..."
							: `${selected.length} tag${selected.length > 1 ? "s" : ""} selected`}
					</span>
					<ChevronRight
						className={`w-4 h-4 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-90" : ""}`}
					/>
				</button>

				{dropdownOpen && (
					<div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
						<div className="p-2 space-y-1">
							{allTags.map((tag) => {
								const active = selected.includes(tag);
								return (
									<button
										key={tag}
										type="button"
										onClick={() => toggle(tag)}
										className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
											active
												? "bg-foreground/10 text-foreground font-medium"
												: "text-muted-foreground hover:bg-accent"
										}`}
									>
										<span className="flex items-center gap-2">
											<span
												className={`w-4 h-4 rounded border flex items-center justify-center ${
													active
														? "bg-foreground border-foreground"
														: "border-border"
												}`}
											>
												{active && (
													<svg
														className="w-3 h-3 text-background"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={3}
															d="M5 13l4 4L19 7"
														/>
													</svg>
												)}
											</span>
											{tag}
										</span>
									</button>
								);
							})}

							{/* + New tag input */}
							<div className="pt-1 border-t border-border">
								{showInput ? (
									<input
										ref={newTagInputRef}
										value={newTagValue}
										onChange={(e) => setNewTagValue(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												commitNewTag();
											}
											if (e.key === "Escape") {
												setShowInput(false);
												setNewTagValue("");
											}
										}}
										onBlur={commitNewTag}
										placeholder="New tag name..."
										className="w-full px-3 py-2 text-sm bg-background border border-ring rounded-md outline-none"
									/>
								) : (
									<button
										type="button"
										onClick={() => setShowInput(true)}
										className="w-full text-left px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors"
									>
										+ New tag
									</button>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</>
	);
}
