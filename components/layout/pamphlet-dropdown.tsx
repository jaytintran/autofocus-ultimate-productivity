"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check, Plus, X, Pencil, Trash2, GripVertical } from "lucide-react";
import { PAMPHLET_COLORS, PAMPHLET_COLOR_LIST } from "@/lib/features/pamphlet-colors";
import type { Pamphlet, PamphletColor } from "@/lib/types";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useLongPress } from "@/hooks/ui/use-long-press";
import { createPortal } from "react-dom";

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
	verticalListSortingStrategy,
	useSortable,
	arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

interface PamphletDropdownProps {
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

function PamphletForm({
	initial,
	onSubmit,
	onCancel,
}: {
	initial?: { name: string; color: PamphletColor };
	onSubmit: (name: string, color: PamphletColor) => Promise<void>;
	onCancel: () => void;
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
		<div className="flex flex-col gap-3 p-3 border-t border-border">
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
		<div className="flex flex-col gap-3 p-3 border-t border-border">
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

function PamphletContextMenu({
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

type OverlayState =
	| { type: "none" }
	| { type: "add" }
	| { type: "edit"; pamphlet: Pamphlet }
	| { type: "delete"; pamphlet: Pamphlet };

export function PamphletDropdown({
	pamphlets,
	activePamphlet,
	onSwitch,
	onAdd,
	onRename,
	onRemove,
	onReorder,
}: PamphletDropdownProps) {
	const [open, setOpen] = useState(false);
	const [overlay, setOverlay] = useState<OverlayState>({ type: "none" });
	const [contextMenu, setContextMenu] = useState<{
		pamphlet: Pamphlet;
		position: { x: number; y: number };
	} | null>(null);
	const [localPamphlets, setLocalPamphlets] = useState(pamphlets);

	useEffect(() => {
		setLocalPamphlets(pamphlets);
	}, [pamphlets]);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 5 },
		}),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 200, tolerance: 5 },
		}),
	);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event;
			if (!over || active.id === over.id) return;

			const oldIndex = localPamphlets.findIndex((p) => p.id === active.id);
			const newIndex = localPamphlets.findIndex((p) => p.id === over.id);
			const reordered = arrayMove(localPamphlets, oldIndex, newIndex);

			setLocalPamphlets(reordered); // optimistic update
			await onReorder(reordered.map((p) => p.id));
		},
		[localPamphlets, onReorder],
	);

	const activeColor = activePamphlet
		? PAMPHLET_COLORS[activePamphlet.color]
		: PAMPHLET_COLORS.slate;

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
		setOpen(false);
	};

	return (
		<Popover
			open={open}
			onOpenChange={(isOpen) => {
				setOpen(isOpen);
				if (!isOpen) setOverlay({ type: "none" });
			}}
		>
			<PopoverTrigger asChild>
				<button
					className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all h-8 border ${
						activePamphlet
							? `${activeColor.bg} ${activeColor.text} ${activeColor.border}`
							: "bg-muted text-muted-foreground border-border"
					}`}
				>
					{activePamphlet && (
						<span
							className={`w-2 h-2 rounded-full shrink-0 ${activeColor.dot}`}
						/>
					)}
					<span>{activePamphlet?.name ?? "Select"}</span>
					<ChevronDown className="w-3 h-3 opacity-60" />
				</button>
			</PopoverTrigger>
			<PopoverContent className="w-56 p-0" align="start">
				{overlay.type === "none" && (
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
						modifiers={[restrictToVerticalAxis]}
					>
						<SortableContext
							items={localPamphlets.map((p) => p.id)}
							strategy={verticalListSortingStrategy}
						>
							<div className="flex flex-col gap-1 p-2">
								{localPamphlets.map((p) => {
									const c = PAMPHLET_COLORS[p.color];
									const isActive = p.id === activePamphlet?.id;
									return (
										<SortablePamphletRow
											key={p.id}
											pamphlet={p}
											isActive={isActive}
											onSwitch={() => {
												onSwitch(p.id);
												setOpen(false);
											}}
											onEdit={() => setOverlay({ type: "edit", pamphlet: p })}
											onDelete={() => setOverlay({ type: "delete", pamphlet: p })}
											onContextMenu={(pos) => setContextMenu({ pamphlet: p, position: pos })}
											canDelete={pamphlets.length > 1}
										/>
									);
								})}
								<button
									onClick={() => setOverlay({ type: "add" })}
									className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-all text-left text-muted-foreground hover:text-foreground"
								>
									<Plus className="w-3.5 h-3.5" />
									<span>New Pamphlet</span>
								</button>
							</div>
						</SortableContext>
					</DndContext>
				)}
				{overlay.type === "add" && (
					<PamphletForm
						onSubmit={handleAdd}
						onCancel={() => setOverlay({ type: "none" })}
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
			</PopoverContent>

			{contextMenu && (
				<PamphletContextMenu
					pamphlet={contextMenu.pamphlet}
					position={contextMenu.position}
					canDelete={pamphlets.length > 1}
					onEdit={() => {
						setOverlay({ type: "edit", pamphlet: contextMenu.pamphlet });
						setContextMenu(null);
					}}
					onDelete={() => {
						setOverlay({ type: "delete", pamphlet: contextMenu.pamphlet });
						setContextMenu(null);
					}}
					onClose={() => setContextMenu(null)}
				/>
			)}
		</Popover>
	);
}

function SortablePamphletRow({
	pamphlet,
	isActive,
	onSwitch,
	onEdit,
	onDelete,
	onContextMenu,
	canDelete,
}: {
	pamphlet: Pamphlet;
	isActive: boolean;
	onSwitch: () => void;
	onEdit: () => void;
	onDelete: () => void;
	onContextMenu: (pos: { x: number; y: number }) => void;
	canDelete: boolean;
}) {
	const c = PAMPHLET_COLORS[pamphlet.color];
	const [showActions, setShowActions] = useState(false);

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: pamphlet.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
	};

	const { onTouchStart, onTouchEnd, onTouchMove } = useLongPress({
		onLongPress: (e) => {
			const touch = e.touches[0];
			onContextMenu({ x: touch.clientX, y: touch.clientY });
		},
		delay: 600,
	});

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="group relative"
			onMouseEnter={() => setShowActions(true)}
			onMouseLeave={() => setShowActions(false)}
			onContextMenu={(e) => {
				e.preventDefault();
				onContextMenu({ x: e.clientX, y: e.clientY });
			}}
		>
			<div className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all w-full ${
				isActive
					? `${c.bg} ${c.text}`
					: "hover:bg-accent text-foreground"
			}`}>
				<button
					{...attributes}
					{...listeners}
					className="p-1 -ml-1 mr-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
				>
					<GripVertical className="w-3.5 h-3.5" />
				</button>
				<button
					onClick={onSwitch}
					onTouchStart={onTouchStart}
					onTouchMove={onTouchMove}
					onTouchEnd={onTouchEnd}
					className="flex items-center gap-2 flex-1 text-left"
				>
					<span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
					<span className="flex-1 truncate">{pamphlet.name}</span>
					{isActive && <Check className="w-3.5 h-3.5 shrink-0" />}
				</button>
			</div>

			{showActions && !isActive && (
				<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-popover/95 backdrop-blur-sm rounded-md p-0.5 border border-border shadow-sm">
					<button
						onClick={(e) => {
							e.stopPropagation();
							onEdit();
						}}
						className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
						title="Rename"
					>
						<Pencil className="w-3 h-3" />
					</button>
					{canDelete && (
						<button
							onClick={(e) => {
								e.stopPropagation();
								onDelete();
							}}
							className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
							title="Delete"
						>
							<Trash2 className="w-3 h-3" />
						</button>
					)}
				</div>
			)}
		</div>
	);
}
