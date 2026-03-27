"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Pencil, Trash2, Check, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PAMPHLET_COLORS, PAMPHLET_COLOR_LIST } from "@/lib/pamphlet-colors";
import type { Pamphlet, PamphletColor } from "@/lib/types";

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
}: PamphletSwitcherProps) {
	const [overlay, setOverlay] = useState<OverlayState>({ type: "none" });
	const scrollRef = useRef<HTMLDivElement>(null);
	const overlayRef = useRef<HTMLDivElement>(null);

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

	return (
		<div className="relative px-4 py-1.5 border-b border-border/50">
			{/* Tab strip */}
			<div
				ref={scrollRef}
				className="flex items-center gap-1 overflow-x-auto scrollbar-none"
			>
				{pamphlets.map((p) => {
					const isActive = p.id === activePamphlet?.id;
					const c = PAMPHLET_COLORS[p.color];
					return (
						<div
							key={p.id}
							className="relative group shrink-0 flex items-center"
						>
							<button
								onClick={() => onSwitch(p.id)}
								className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
									isActive
										? `${c.bg} ${c.text} ${c.border} border`
										: "text-muted-foreground hover:text-foreground hover:bg-accent"
								}`}
							>
								<ColorDot color={p.color} />
								{p.name}
							</button>

							{/* Edit / delete on hover — only show when no overlay open */}
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
				})}

				{/* Add button */}
				<button
					onClick={() => setOverlay({ type: "add" })}
					className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ml-1"
				>
					<Plus className="w-3 h-3" />
				</button>
			</div>

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
		</div>
	);
}
