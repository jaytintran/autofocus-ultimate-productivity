import { useState, useEffect } from "react";
import type { TimeBlock } from "@/lib/types";
import type { ContextMenuState } from "../types";
import { BLOCK_COLORS } from "../constants";

export function BlockContextMenu({
	menu,
	onClose,
	onUpdateBlock,
}: {
	menu: ContextMenuState;
	onClose: () => void;
	onUpdateBlock: (id: string, updates: Partial<TimeBlock>) => void;
}) {
	const [editTitle, setEditTitle] = useState("");

	useEffect(() => {
		if (menu.block) {
			setEditTitle(menu.block.label);
		}
	}, [menu.block]);

	if (!menu.block) return null;

	const handleSaveTitle = () => {
		const trimmed = editTitle.trim();
		if (trimmed && trimmed !== menu.block!.label) {
			onUpdateBlock(menu.block!.id, { label: trimmed });
		}
		onClose();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") handleSaveTitle();
		if (e.key === "Escape") onClose();
	};

	return (
		<>
			{/* Backdrop to close on click outside */}
			<div className="fixed inset-0 z-40" onClick={onClose} />

			{/* Context menu */}
			<div
				className="fixed z-50 min-w-[200px] bg-popover border border-border rounded-lg shadow-xl py-2"
				style={{ left: menu.x, top: menu.y }}
			>
				{/* Title edit section */}
				<div className="px-3 py-2 border-b border-border">
					<label className="text-xs text-muted-foreground block mb-1.5">
						Block Title
					</label>
					<input
						type="text"
						value={editTitle}
						onChange={(e) => setEditTitle(e.target.value)}
						onKeyDown={handleKeyDown}
						onClick={(e) => e.stopPropagation()}
						className="w-full text-sm px-2 py-1.5 rounded border border-input bg-background focus:outline-none focus:ring-2 focus:ring-[#8b9a6b]"
						autoFocus
					/>
					<div className="flex gap-2 mt-2">
						<button
							onClick={handleSaveTitle}
							className="flex-1 text-xs bg-[#8b9a6b] text-white px-2 py-1 rounded hover:bg-[#8b9a6b]/90"
						>
							Save
						</button>
						<button
							onClick={onClose}
							className="flex-1 text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80"
						>
							Cancel
						</button>
					</div>
				</div>

				{/* Color picker section */}
				<div className="px-3 py-2">
					<label className="text-xs text-muted-foreground block mb-1.5">
						Color
					</label>
					<div className="grid grid-cols-5 gap-1.5">
						{BLOCK_COLORS.map((color) => (
							<button
								key={color}
								onClick={() => {
									onUpdateBlock(menu.block!.id, { color });
									onClose();
								}}
								className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
								style={{
									backgroundColor: color,
									borderColor:
										color === menu.block!.color ? "white" : "transparent",
									boxShadow:
										color === menu.block!.color ? "0 0 0 1px #8b9a6b" : "none",
								}}
								title={color}
							/>
						))}
					</div>
				</div>
			</div>
		</>
	);
}
