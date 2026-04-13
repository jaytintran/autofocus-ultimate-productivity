"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Play, Check, RefreshCw, Trash2, Tag, ArrowRight, Edit } from "lucide-react";
import type { Task, Pamphlet } from "@/lib/types";
import type { TagId } from "@/lib/tags";
import { TAG_DEFINITIONS } from "@/lib/tags";
import { PAMPHLET_COLORS } from "@/lib/features/pamphlet-colors";

interface TaskContextMenuProps {
	task: Task;
	position: { x: number; y: number };
	isFirst: boolean;
	isLast: boolean;
	pamphlets: Pamphlet[];
	activePamphletId: string | null;
	onClose: () => void;
	onStart: (task: Task) => void;
	onDone: (task: Task) => void;
	onReenter: (task: Task) => void;
	onDelete: (taskId: string) => void;
	onPump: (taskId: string) => void;
	onSink: (taskId: string) => void;
	onUpdateTag: (taskId: string, tag: TagId | null) => void;
	onMoveTask: (taskId: string, toPamphletId: string) => void;
	onEdit?: () => void;
}

export function TaskContextMenu({
	task,
	position,
	isFirst,
	isLast,
	pamphlets,
	activePamphletId,
	onClose,
	onStart,
	onDone,
	onReenter,
	onDelete,
	onPump,
	onSink,
	onUpdateTag,
	onMoveTask,
	onEdit,
}: TaskContextMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);
	const [openSubmenu, setOpenSubmenu] = useState<"tag" | "move" | null>(null);
	const [submenuFlip, setSubmenuFlip] = useState(false);

	const handleSubmenuOpen = (type: "tag" | "move", e: React.MouseEvent) => {
		const trigger = e.currentTarget as HTMLElement;
		const rect = trigger.getBoundingClientRect();
		const submenuHeight =
			type === "tag"
				? TAG_DEFINITIONS.length * 36 + 48 // approx height
				: otherPamphlets.length * 36 + 16;
		const wouldOverflow = rect.top + submenuHeight > window.innerHeight - 16;
		setSubmenuFlip(wouldOverflow);
		setOpenSubmenu(type);
	};

	// Close on outside click or Escape
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		const handleClick = (e: Event) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				onClose();
			}
		};
		document.addEventListener("keydown", handleKey);
		document.addEventListener("mousedown", handleClick);
		document.addEventListener("touchstart", handleClick);
		return () => {
			document.removeEventListener("keydown", handleKey);
			document.removeEventListener("mousedown", handleClick);
			document.removeEventListener("touchstart", handleClick);
		};
	}, [onClose]);

	// Clamp to viewport
	useEffect(() => {
		if (!menuRef.current) return;
		const rect = menuRef.current.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		if (rect.right > vw) {
			menuRef.current.style.left = `${vw - rect.width - 8}px`;
		}
		if (rect.bottom > vh) {
			menuRef.current.style.top = `${vh - rect.height - 8}px`;
		}
	}, [position]);

	const otherPamphlets = pamphlets.filter((p) => p.id !== activePamphletId);

	const item = (
		label: string,
		icon: React.ReactNode,
		onClick: () => void,
		variant: "default" | "destructive" = "default",
	) => (
		<button
			key={label}
			onMouseDown={(e) => {
				e.preventDefault();
				e.stopPropagation();
			}}
			onClick={(e) => {
				e.stopPropagation();
				onClick();
				onClose();
			}}
			className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-md transition-colors text-left
        ${
					variant === "destructive"
						? "text-destructive hover:bg-destructive/10"
						: "text-foreground hover:bg-accent"
				}`}
		>
			<span className="w-4 h-4 flex items-center justify-center shrink-0 text-muted-foreground">
				{icon}
			</span>
			{label}
		</button>
	);

	const divider = <div className="h-px bg-border mx-2 my-1" />;

	return createPortal(
		<div
			ref={menuRef}
			style={{
				position: "fixed",
				top: position.y,
				left: position.x,
				zIndex: 9999,
			}}
			className="bg-popover border border-border rounded-xl shadow-xl p-1.5 w-52 animate-in fade-in-0 zoom-in-95 duration-100"
		>
			{/* Task label */}
			<div className="px-3 py-1.5 mb-1">
				<p className="text-xs text-muted-foreground truncate">{task.text}</p>
			</div>
			{divider}

			{onEdit && item("Edit", <Edit className="w-3.5 h-3.5" />, onEdit)}
			{onEdit && divider}

			{item("Start", <Play className="w-3.5 h-3.5" />, () => onStart(task))}
			{item("Complete", <Check className="w-3.5 h-3.5" />, () => onDone(task))}
			{item("Re-enter", <RefreshCw className="w-3.5 h-3.5" />, () =>
				onReenter(task),
			)}

			{divider}

			{!isFirst &&
				item(
					"Pump to top",
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<polyline points="17 11 12 6 7 11" />
						<polyline points="17 18 12 13 7 18" />
					</svg>,
					() => onPump(task.id),
				)}

			{!isLast &&
				item(
					"Sink to bottom",
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<polyline points="7 13 12 18 17 13" />
						<polyline points="7 6 12 11 17 6" />
					</svg>,
					() => onSink(task.id),
				)}

			{divider}

			{/* Tag submenu */}
			<div className="relative">
				<button
					className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left"
					onMouseEnter={(e) => handleSubmenuOpen("tag", e)}
					onMouseLeave={() => setOpenSubmenu(null)}
				>
					<span className="w-4 h-4 flex items-center justify-center shrink-0 text-muted-foreground">
						<Tag className="w-3.5 h-3.5" />
					</span>
					<span className="flex-1">Change tag</span>
					<ArrowRight className="w-3 h-3 text-muted-foreground" />
				</button>
				{openSubmenu === "tag" && (
					<div
						className="absolute left-full w-44 bg-popover border border-border rounded-xl shadow-xl p-1.5 z-[10000]"
						style={{
							top: submenuFlip ? "auto" : 0,
							bottom: submenuFlip ? 0 : "auto",
						}}
						onMouseEnter={() => setOpenSubmenu("tag")}
						onMouseLeave={() => setOpenSubmenu(null)}
					>
						<div className="absolute -left-2 inset-y-0 w-2" />
						{TAG_DEFINITIONS.map((tag) => (
							<button
								key={tag.id}
								onClick={(e) => {
									e.stopPropagation();
									onUpdateTag(task.id, task.tag === tag.id ? null : tag.id);
									onClose();
								}}
								className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left
            ${task.tag === tag.id ? "bg-accent" : ""}`}
							>
								<span>{tag.emoji}</span>
								<span>{tag.label}</span>
								{task.tag === tag.id && (
									<Check className="w-3 h-3 ml-auto text-muted-foreground" />
								)}
							</button>
						))}
						{task.tag && (
							<>
								<div className="h-px bg-border mx-2 my-1" />
								<button
									onClick={(e) => {
										e.stopPropagation();
										onUpdateTag(task.id, null);
										onClose();
									}}
									className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent text-muted-foreground transition-colors"
								>
									Remove tag
								</button>
							</>
						)}
					</div>
				)}
			</div>

			{/* Move to pamphlet submenu */}
			{otherPamphlets.length > 0 && (
				<div className="relative">
					<button
						className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left"
						onMouseEnter={(e) => handleSubmenuOpen("move", e)}
						onMouseLeave={() => setOpenSubmenu(null)}
					>
						<span className="w-4 h-4 flex items-center justify-center shrink-0 text-muted-foreground">
							<ArrowRight className="w-3.5 h-3.5" />
						</span>
						<span className="flex-1">Move to</span>
						<ArrowRight className="w-3 h-3 text-muted-foreground" />
					</button>
					{openSubmenu === "move" && (
						<div
							className="absolute left-full w-44 bg-popover border border-border rounded-xl shadow-xl p-1.5 z-[10000]"
							style={{
								top: submenuFlip ? "auto" : 0,
								bottom: submenuFlip ? 0 : "auto",
							}}
							onMouseEnter={() => setOpenSubmenu("move")}
							onMouseLeave={() => setOpenSubmenu(null)}
						>
							<div className="absolute -left-2 inset-y-0 w-2" />
							{otherPamphlets.map((p) => {
								const c = PAMPHLET_COLORS[p.color];
								return (
									<button
										key={p.id}
										onClick={(e) => {
											e.stopPropagation();
											onMoveTask(task.id, p.id);
											onClose();
										}}
										className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left"
									>
										<span
											className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`}
										/>
										<span className={c.text}>{p.name}</span>
									</button>
								);
							})}
						</div>
					)}
				</div>
			)}

			{divider}
			{item(
				"Delete",
				<Trash2 className="w-3.5 h-3.5" />,
				() => onDelete(task.id),
				"destructive",
			)}
		</div>,
		document.body,
	);
}
