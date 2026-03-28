"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PAMPHLET_COLORS, PAMPHLET_COLOR_LIST } from "@/lib/pamphlet-colors";
import type { Pamphlet, PamphletColor } from "@/lib/types";

import { useLongPress } from "@/hooks/use-long-press";
import { createPortal } from "react-dom";

import { Plus, Pencil, Trash2, Check, X, GripVertical } from "lucide-react";

import {
	DndContext,
	closestCenter,
	PointerSensor,
	TouchSensor,
	useSensor,
	useSensors,
	DragEndEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	horizontalListSortingStrategy,
	useSortable,
	arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// =============================================================================
// TYPES
// =============================================================================

interface PamphletSwitcherProps {
	pamphlets: Pamphlet[];
	activePamphlet: Pamphlet | null;
	onSwitch: (id: string) => void;
	onAdd: (name: string, color: PamphletColor) => Promise<Pamphlet>;
	onRename: (id: string, name: string, color: PamphletColor) => Promise<void>;
	onRemove: (
		id: string,
		action: "transfer" | "delete-all",
		transferToId?: string,
	) => Promise<void>;
	onReorder: (orderedIds: string[]) => Promise<void>;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ColorDot({
	color,
	size = "sm",
}: {
	color: PamphletColor;
	size?: "sm" | "md";
}) {
	const c = PAMPHLET_COLORS[color];
	return (
		<span
			className={`rounded-full shrink-0 ${c.dot} ${size === "sm" ? "w-2 h-2" : "w-3 h-3"}`}
		/>
	);
}

function ColorPicker({
	selected,
	onChange,
}: {
	selected: PamphletColor;
	onChange: (c: PamphletColor) => void;
}) {
	return (
		<div className="flex flex-wrap gap-2">
			{PAMPHLET_COLOR_LIST.map((color) => {
				const c = PAMPHLET_COLORS[color];
				return (
					<button
						key={color}
						onClick={() => onChange(color)}
						className={`w-5 h-5 rounded-full ${c.dot} ring-offset-background transition-all ${
							selected === color
								? "ring-2 ring-ring ring-offset-2"
								: "opacity-60 hover:opacity-100"
						}`}
						title={c.label}
					/>
				);
			})}
		</div>
	);
}

// =============================================================================
// INLINE FORM (Add / Edit)
// =============================================================================

function PamphletForm({
	initial,
	onSubmit,
	onCancel,
	submitLabel,
}: {
	initial?: { name: string; color: PamphletColor };
	onSubmit: (name: string, color: PamphletColor) => Promise<void>;
	onCancel: () => void;
	submitLabel: string;
}) {
	const [name, setName] = useState(initial?.name ?? "");
	const [color, setColor] = useState<PamphletColor>(initial?.color ?? "slate");
	const [loading, setLoading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const handleSubmit = async () => {
		const trimmed = name.trim();
		if (!trimmed) return;
		setLoading(true);
		try {
			await onSubmit(trimmed, color);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col gap-3 p-3 bg-popover border border-border rounded-xl shadow-lg w-64">
			<input
				ref={inputRef}
				value={name}
				onChange={(e) => setName(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") handleSubmit();
					if (e.key === "Escape") onCancel();
				}}
				placeholder="Pamphlet name…"
				className="w-full bg-background border border-input rounded-lg px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
			/>
			<ColorPicker selected={color} onChange={setColor} />
			<div className="flex gap-2 justify-end">
				<button
					onClick={onCancel}
					className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
				>
					<X className="w-3.5 h-3.5" />
				</button>
				<button
					onClick={handleSubmit}
					disabled={!name.trim() || loading}
					className="p-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
				>
					<Check className="w-3.5 h-3.5" />
				</button>
			</div>
		</div>
	);
}

// =============================================================================
// DELETE CONFIRM
// =============================================================================

function DeleteConfirm({
	pamphlet,
	others,
	onConfirm,
	onCancel,
}: {
	pamphlet: Pamphlet;
	others: Pamphlet[];
	onConfirm: (
		action: "transfer" | "delete-all",
		transferToId?: string,
	) => Promise<void>;
	onCancel: () => void;
}) {
	const [transferTo, setTransferTo] = useState<string>(others[0]?.id ?? "");
	const [loading, setLoading] = useState(false);

	const handleTransfer = async () => {
		if (!transferTo) return;
		setLoading(true);
		try {
			await onConfirm("transfer", transferTo);
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteAll = async () => {
		setLoading(true);
		try {
			await onConfirm("delete-all");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col gap-3 p-3 bg-popover border border-border rounded-xl shadow-lg w-64">
			<p className="text-xs text-muted-foreground">
				Delete{" "}
				<span className="text-foreground font-medium">"{pamphlet.name}"</span>?
				Choose what happens to its tasks:
			</p>

			{others.length > 0 && (
				<div className="flex flex-col gap-1.5">
					<p className="text-xs text-muted-foreground">Move tasks to:</p>
					<select
						value={transferTo}
						onChange={(e) => setTransferTo(e.target.value)}
						className="w-full bg-background border border-input rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
					>
						{others.map((p) => (
							<option key={p.id} value={p.id}>
								{p.name}
							</option>
						))}
					</select>
					<button
						onClick={handleTransfer}
						disabled={loading}
						className="w-full text-xs py-1.5 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
					>
						Move &amp; Delete
					</button>
				</div>
			)}

			<button
				onClick={handleDeleteAll}
				disabled={loading}
				className="w-full text-xs py-1.5 px-3 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
			>
				Delete all tasks too
			</button>

			<button
				onClick={onCancel}
				className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
			>
				Cancel
			</button>
		</div>
	);
}

// =============================================================================
// CONTEXT MENU
// =============================================================================

function PamphletTabContextMenu({
	pamphlet,
	position,
	canDelete,
	onEdit,
	onDelete,
	onClose,
}: {
	pamphlet: Pamphlet;
	position: { x: number; y: number };
	canDelete: boolean;
	onEdit: () => void;
	onDelete: () => void;
	onClose: () => void;
}) {
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handler = (e: MouseEvent | TouchEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				onClose();
			}
		};
		const keyHandler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("mousedown", handler);
		document.addEventListener("touchstart", handler);
		document.addEventListener("keydown", keyHandler);
		return () => {
			document.removeEventListener("mousedown", handler);
			document.removeEventListener("touchstart", handler);
			document.removeEventListener("keydown", keyHandler);
		};
	}, [onClose]);

	// Clamp to viewport
	useEffect(() => {
		if (!menuRef.current) return;
		const rect = menuRef.current.getBoundingClientRect();
		if (rect.right > window.innerWidth) {
			menuRef.current.style.left = `${window.innerWidth - rect.width - 8}px`;
		}
		if (rect.bottom > window.innerHeight) {
			menuRef.current.style.top = `${window.innerHeight - rect.height - 8}px`;
		}
	}, [position]);

	const c = PAMPHLET_COLORS[pamphlet.color];

	return createPortal(
		<div
			ref={menuRef}
			style={{
				position: "fixed",
				top: position.y,
				left: position.x,
				zIndex: 9999,
			}}
			className="bg-popover border border-border rounded-xl shadow-xl p-1.5 w-44 animate-in fade-in-0 zoom-in-95 duration-100"
		>
			<div className="px-3 py-1.5 mb-1 flex items-center gap-2">
				<span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
				<p className={`text-xs font-medium truncate ${c.text}`}>
					{pamphlet.name}
				</p>
			</div>
			<div className="h-px bg-border mx-2 mb-1" />
			<button
				onClick={() => {
					onEdit();
					onClose();
				}}
				className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left text-foreground"
			>
				<Pencil className="w-3.5 h-3.5 text-muted-foreground" />
				Rename
			</button>
			{canDelete && (
				<button
					onClick={() => {
						onDelete();
						onClose();
					}}
					className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left text-destructive"
				>
					<Trash2 className="w-3.5 h-3.5" />
					Delete
				</button>
			)}
		</div>,
		document.body,
	);
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

type OverlayState =
	| { type: "none" }
	| { type: "add" }
	| { type: "edit"; pamphlet: Pamphlet }
	| { type: "delete"; pamphlet: Pamphlet };

export function PamphletSwitcher({
	pamphlets,
	activePamphlet,
	onSwitch,
	onAdd,
	onRename,
	onRemove,
	onReorder,
}: PamphletSwitcherProps) {
	// ── State ──────────────────────────────────────────────────────

	const [overlay, setOverlay] = useState<OverlayState>({ type: "none" });
	const scrollRef = useRef<HTMLDivElement>(null);
	const overlayRef = useRef<HTMLDivElement>(null);

	const [tabContextMenu, setTabContextMenu] = useState<{
		pamphlet: Pamphlet;
		position: { x: number; y: number };
	} | null>(null);

	// ── Re-Order ──────────────────────────────────────────────────────

	const [localPamphlets, setLocalPamphlets] = useState(pamphlets);

	useEffect(() => {
		setLocalPamphlets(pamphlets);
	}, [pamphlets]);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 5 },
		}),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 600, tolerance: 8 },
		}),
	);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event;
			if (!over || active.id === over.id) return;

			const oldIndex = localPamphlets.findIndex((p) => p.id === active.id);
			const newIndex = localPamphlets.findIndex((p) => p.id === over.id);
			const reordered = arrayMove(localPamphlets, oldIndex, newIndex);

			setLocalPamphlets(reordered); // optimistic
			await onReorder(reordered.map((p) => p.id));
		},
		[localPamphlets, onReorder],
	);

	// ── Handlers ───────────────────────────────────────────────────

	// Close overlay on outside click
	useEffect(() => {
		if (overlay.type === "none") return;
		const handler = (e: MouseEvent) => {
			if (
				overlayRef.current &&
				!overlayRef.current.contains(e.target as Node)
			) {
				setOverlay({ type: "none" });
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [overlay.type]);

	const handleAdd = async (name: string, color: PamphletColor) => {
		await onAdd(name, color);
		setOverlay({ type: "none" });
	};

	const handleRename = async (name: string, color: PamphletColor) => {
		if (overlay.type !== "edit") return;
		await onRename(overlay.pamphlet.id, name, color);
		setOverlay({ type: "none" });
	};

	const handleDelete = async (
		action: "transfer" | "delete-all",
		transferToId?: string,
	) => {
		if (overlay.type !== "delete") return;
		await onRemove(overlay.pamphlet.id, action, transferToId);
		setOverlay({ type: "none" });
	};

	// ── PamphletTab (inner component — defined here so it closes ──
	// ── over overlay/setOverlay from the parent scope)           ──
	function PamphletTabOld({
		p,
		isActive,
		onSwitch,
		onLongPress,
	}: {
		p: Pamphlet;
		isActive: boolean;
		onSwitch: (id: string) => void;
		onLongPress: (p: Pamphlet, pos: { x: number; y: number }) => void;
	}) {
		const c = PAMPHLET_COLORS[p.color];
		const { onTouchStart, onTouchEnd, onTouchMove } = useLongPress({
			onLongPress: (e) => {
				const touch = e.touches[0];
				onLongPress(p, { x: touch.clientX, y: touch.clientY });
			},
			delay: 600,
		});

		return (
			<div className="relative group shrink-0 flex items-center select-none">
				<button
					onClick={() => onSwitch(p.id)}
					onTouchStart={onTouchStart}
					onTouchMove={onTouchMove}
					onTouchEnd={onTouchEnd}
					className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
						isActive
							? `${c.bg} ${c.text} ${c.border} border`
							: "text-muted-foreground hover:text-foreground hover:bg-accent"
					}`}
				>
					<ColorDot color={p.color} />
					{p.name}
				</button>

				{/* Desktop hover controls — unchanged */}
				{overlay.type === "none" && (
					<div className="absolute -top-1 -right-1 hidden group-hover:flex items-center gap-0.5 bg-popover border border-border rounded shadow-sm px-0.5 py-0.5 z-10">
						<button
							onClick={(e) => {
								e.stopPropagation();
								setOverlay({ type: "edit", pamphlet: p });
							}}
							className="p-0.5 hover:text-foreground text-muted-foreground rounded transition-colors"
						>
							<Pencil className="w-2.5 h-2.5" />
						</button>
						{pamphlets.length > 1 && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									setOverlay({ type: "delete", pamphlet: p });
								}}
								className="p-0.5 hover:text-destructive text-muted-foreground rounded transition-colors"
							>
								<Trash2 className="w-2.5 h-2.5" />
							</button>
						)}
					</div>
				)}
			</div>
		);
	}

	function PamphletTab({
		p,
		isActive,
		onSwitch,
		onLongPress,
	}: {
		p: Pamphlet;
		isActive: boolean;
		onSwitch: (id: string) => void;
		onLongPress: (p: Pamphlet, pos: { x: number; y: number }) => void;
	}) {
		const c = PAMPHLET_COLORS[p.color];
		const {
			attributes,
			listeners,
			setNodeRef,
			transform,
			transition,
			isDragging,
		} = useSortable({ id: p.id });

		const style = {
			transform: CSS.Transform.toString(transform),
			transition,
			opacity: isDragging ? 0.5 : 1,
		};

		const { onTouchStart, onTouchEnd, onTouchMove } = useLongPress({
			onLongPress: (e) => {
				const touch = e.touches[0];
				onLongPress(p, { x: touch.clientX, y: touch.clientY });
			},
			delay: 800,
		});

		return (
			<div
				ref={setNodeRef}
				style={style}
				{...attributes}
				{...listeners}
				className="relative group shrink-0 flex items-center cursor-grab active:cursor-grabbing touch-none"
			>
				<button
					onClick={() => onSwitch(p.id)}
					onTouchStart={onTouchStart}
					onTouchMove={onTouchMove}
					onTouchEnd={onTouchEnd}
					className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
						isActive
							? `${c.bg} ${c.text} ${c.border} border`
							: "text-muted-foreground hover:text-foreground hover:bg-accent"
					}`}
				>
					<ColorDot color={p.color} />
					{p.name}
				</button>

				{overlay.type === "none" && (
					<div className="absolute -top-1 -right-1 hidden group-hover:flex items-center gap-0.5 bg-popover border border-border rounded shadow-sm px-0.5 py-0.5 z-10">
						<button
							onClick={(e) => {
								e.stopPropagation();
								setOverlay({ type: "edit", pamphlet: p });
							}}
							className="p-0.5 hover:text-foreground text-muted-foreground rounded transition-colors"
						>
							<Pencil className="w-2.5 h-2.5" />
						</button>
						{pamphlets.length > 1 && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									setOverlay({ type: "delete", pamphlet: p });
								}}
								className="p-0.5 hover:text-destructive text-muted-foreground rounded transition-colors"
							>
								<Trash2 className="w-2.5 h-2.5" />
							</button>
						)}
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="relative px-4 py-1.5 border-b border-border/50">
			{/* Tab strip */}
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext
					items={localPamphlets.map((p) => p.id)}
					strategy={horizontalListSortingStrategy}
				>
					<div
						ref={scrollRef}
						className="flex items-center gap-1 overflow-x-auto scrollbar-none"
					>
						{localPamphlets.map((p) => (
							<PamphletTab
								key={p.id}
								p={p}
								isActive={p.id === activePamphlet?.id}
								onSwitch={onSwitch}
								onLongPress={(pamphlet, position) =>
									setTabContextMenu({ pamphlet, position })
								}
							/>
						))}
						<button
							onClick={() => setOverlay({ type: "add" })}
							className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ml-1"
						>
							<Plus className="w-3 h-3" />
						</button>
					</div>
				</SortableContext>
			</DndContext>

			{/* Floating overlay panels */}
			<AnimatePresence>
				{overlay.type !== "none" && (
					<motion.div
						ref={overlayRef}
						key={overlay.type}
						initial={{ opacity: 0, y: -6, scale: 0.97 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -6, scale: 0.97 }}
						transition={{ duration: 0.15 }}
						className="absolute left-4 top-full mt-1 z-50"
					>
						{overlay.type === "add" && (
							<PamphletForm
								onSubmit={handleAdd}
								onCancel={() => setOverlay({ type: "none" })}
								submitLabel="Create"
							/>
						)}
						{overlay.type === "edit" && (
							<PamphletForm
								initial={{
									name: overlay.pamphlet.name,
									color: overlay.pamphlet.color,
								}}
								onSubmit={handleRename}
								onCancel={() => setOverlay({ type: "none" })}
								submitLabel="Save"
							/>
						)}
						{overlay.type === "delete" && (
							<DeleteConfirm
								pamphlet={overlay.pamphlet}
								others={pamphlets.filter((p) => p.id !== overlay.pamphlet.id)}
								onConfirm={handleDelete}
								onCancel={() => setOverlay({ type: "none" })}
							/>
						)}
					</motion.div>
				)}
			</AnimatePresence>

			{tabContextMenu && (
				<PamphletTabContextMenu
					pamphlet={tabContextMenu.pamphlet}
					position={tabContextMenu.position}
					canDelete={pamphlets.length > 1}
					onEdit={() =>
						setOverlay({ type: "edit", pamphlet: tabContextMenu.pamphlet })
					}
					onDelete={() =>
						setOverlay({ type: "delete", pamphlet: tabContextMenu.pamphlet })
					}
					onClose={() => setTabContextMenu(null)}
				/>
			)}
		</div>
	);
}
