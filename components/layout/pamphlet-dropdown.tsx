"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, X } from "lucide-react";
import { PAMPHLET_COLORS, PAMPHLET_COLOR_LIST } from "@/lib/features/pamphlet-colors";
import type { Pamphlet, PamphletColor } from "@/lib/types";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

interface PamphletDropdownProps {
	pamphlets: Pamphlet[];
	activePamphlet: Pamphlet | null;
	onSwitch: (id: string) => void;
	onAdd: (name: string, color: PamphletColor) => Promise<Pamphlet>;
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
	onSubmit,
	onCancel,
}: {
	onSubmit: (name: string, color: PamphletColor) => Promise<void>;
	onCancel: () => void;
}) {
	const [name, setName] = useState("");
	const [color, setColor] = useState<PamphletColor>("slate");
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

export function PamphletDropdown({
	pamphlets,
	activePamphlet,
	onSwitch,
	onAdd,
}: PamphletDropdownProps) {
	const [open, setOpen] = useState(false);
	const [showForm, setShowForm] = useState(false);

	const activeColor = activePamphlet
		? PAMPHLET_COLORS[activePamphlet.color]
		: PAMPHLET_COLORS.slate;

	const handleAdd = async (name: string, color: PamphletColor) => {
		await onAdd(name, color);
		setShowForm(false);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={(isOpen) => {
			setOpen(isOpen);
			if (!isOpen) setShowForm(false);
		}}>
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
				<div className="flex flex-col gap-1 p-2">
					{pamphlets.map((p) => {
						const c = PAMPHLET_COLORS[p.color];
						const isActive = p.id === activePamphlet?.id;
						return (
							<button
								key={p.id}
								onClick={() => {
									onSwitch(p.id);
									setOpen(false);
								}}
								className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all text-left ${
									isActive
										? `${c.bg} ${c.text}`
										: "hover:bg-accent text-foreground"
								}`}
							>
								<span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
								<span className="flex-1 truncate">{p.name}</span>
								{isActive && <Check className="w-3.5 h-3.5 shrink-0" />}
							</button>
						);
					})}
					<button
						onClick={() => setShowForm(true)}
						className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-all text-left text-muted-foreground hover:text-foreground"
					>
						<Plus className="w-3.5 h-3.5" />
						<span>New Pamphlet</span>
					</button>
				</div>
				{showForm && (
					<PamphletForm
						onSubmit={handleAdd}
						onCancel={() => setShowForm(false)}
					/>
				)}
			</PopoverContent>
		</Popover>
	);
}
