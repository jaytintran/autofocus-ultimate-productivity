"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	Check,
	ChevronDown,
	Trash2,
	Pencil,
	Plus,
	Send,
	GripVertical,
} from "lucide-react";
import { useTracker } from "@/hooks/use-tracker";
import type { Tracker, TrackerType } from "@/lib/store";
import { formatTimeCompact, getTaskAge } from "@/lib/utils/time-utils";
import type { Task } from "@/lib/types";
import type { TrackerViewType } from "./view-tabs";

import {
	DndContext,
	closestCenter,
	PointerSensor,
	TouchSensor,
	useSensor,
	useSensors,
	DragEndEvent,
	DragOverlay,
} from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
	useSortable,
	arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<TrackerType, string> = {
	book: "📖 Book",
	course: "🎓 Course",
	project: "🏗️ Project",
	"mega-project": "🚀 Mega Project",
	habit: "🔁 Habit",
};

const TYPE_FILTER_OPTIONS: Array<{
	value: TrackerType | "all";
	label: string;
}> = [
	{ value: "all", label: "All" },
	{ value: "book", label: "📖 Books" },
	{ value: "course", label: "🎓 Courses" },
	{ value: "project", label: "🏗️ Projects" },
	{ value: "mega-project", label: "🚀 Mega Projects" },
];

const TRACKER_TYPES: TrackerType[] = [
	"book",
	"course",
	"project",
	"mega-project",
	"habit",
];

const TYPE_EMOJI: Record<TrackerType, string> = {
	book: "📖",
	course: "🎓",
	project: "🏗️",
	"mega-project": "🚀",
	habit: "🔁",
};

const TYPE_SHORT: Record<TrackerType, string> = {
	book: "Book",
	course: "Course",
	project: "Project",
	"mega-project": "Mega Project",
	habit: "Habit",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function aggregateTasks(tasks: Task[]): { count: number; totalMs: number } {
	return {
		count: tasks.length,
		totalMs: tasks.reduce((sum, t) => sum + (t.total_time_ms ?? 0), 0),
	};
}

// ─── Floating Tracker Input ───────────────────────────────────────────────────

interface TrackerInputProps {
	defaultType: TrackerType;
	onSave: (name: string, type: TrackerType) => Promise<void>;
}

function TrackerInput({ defaultType, onSave }: TrackerInputProps) {
	const [name, setName] = useState("");
	const [type, setType] = useState<TrackerType>(defaultType);
	const [showTypePicker, setShowTypePicker] = useState(false);
	const [saving, setSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setType(defaultType);
	}, [defaultType]);

	useEffect(() => {
		if (!showTypePicker) return;
		const handler = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setShowTypePicker(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [showTypePicker]);

	const handleSubmit = useCallback(async () => {
		const trimmed = name.trim();
		if (!trimmed) return;
		setSaving(true);
		try {
			await onSave(trimmed, type);
			setName("");
			inputRef.current?.focus();
		} finally {
			setSaving(false);
		}
	}, [name, type, onSave]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
		if (e.key === "Escape") {
			setName("");
			setShowTypePicker(false);
		}
	};

	return (
		<div
			ref={containerRef}
			className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-10"
		>
			{/* Type picker popover — floats above the bar */}
			<AnimatePresence>
				{showTypePicker && (
					<motion.div
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 6 }}
						transition={{ duration: 0.15, ease: "easeOut" }}
						className="mb-2 bg-card border border-border rounded-2xl shadow-lg p-3"
					>
						<p className="text-[11px] text-muted-foreground mb-2 px-1">
							Choose a type
						</p>
						<div className="flex flex-wrap gap-2">
							{TRACKER_TYPES.map((t) => (
								<button
									key={t}
									type="button"
									onMouseDown={(e) => {
										e.preventDefault();
										setType(t);
										setShowTypePicker(false);
										inputRef.current?.focus();
									}}
									className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
										type === t
											? "border-[#8b9a6b]/60 bg-[#8b9a6b]/10 text-foreground"
											: "border-border text-foreground hover:bg-accent hover:border-foreground/30"
									}`}
								>
									{TYPE_EMOJI[t]} {TYPE_SHORT[t]}
								</button>
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Input pill bar */}
			<div className="bg-card border border-border rounded-full shadow-lg px-4 py-2.5 flex items-center gap-3">
				{/* Plus — opens type picker, rotates to × when open */}
				<button
					type="button"
					onClick={() => setShowTypePicker((prev) => !prev)}
					className={`p-0.5 rounded-full transition-colors flex-shrink-0 ${
						showTypePicker
							? "text-[#8b9a6b]"
							: "text-muted-foreground hover:text-foreground"
					}`}
					title="Choose type"
				>
					<Plus
						className={`w-5 h-5 transition-transform duration-200 ${
							showTypePicker ? "rotate-45" : "rotate-0"
						}`}
					/>
				</button>

				{/* Active type pill */}
				<button
					type="button"
					onClick={() => setShowTypePicker((prev) => !prev)}
					className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[#8b9a6b]/10 flex-shrink-0 hover:bg-[#8b9a6b]/20 transition-colors"
					title="Change type"
				>
					<span>{TYPE_EMOJI[type]}</span>
					<span className="text-muted-foreground">{TYPE_SHORT[type]}</span>
				</button>

				{/* Name input */}
				<input
					ref={inputRef}
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Add a tracker..."
					className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm"
				/>

				{/* Submit */}
				<button
					onClick={handleSubmit}
					disabled={saving || !name.trim()}
					type="button"
					className="p-1.5 hover:bg-accent rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
				>
					<Send className="w-4 h-4 text-[#8b9a6b]" />
				</button>
			</div>
		</div>
	);
}

// ─── Inline Edit Form (inside the list) ──────────────────────────────────────

interface TrackerEditFormProps {
	initial: { name: string; type: TrackerType };
	onSave: (name: string, type: TrackerType) => Promise<void>;
	onCancel: () => void;
}

function TrackerEditForm({ initial, onSave, onCancel }: TrackerEditFormProps) {
	const [name, setName] = useState(initial.name);
	const [type, setType] = useState<TrackerType>(initial.type);
	const [saving, setSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const handleSubmit = async () => {
		const trimmed = name.trim();
		if (!trimmed) return;
		setSaving(true);
		try {
			await onSave(trimmed, type);
		} finally {
			setSaving(false);
		}
	};

	const shortLabel: Record<TrackerType, string> = {
		book: "Book",
		course: "Course",
		project: "Project",
		"mega-project": "Mega Project",
		habit: "Habit",
	};

	return (
		<div className="bg-card border border-border rounded-full shadow-sm px-4 py-2 flex items-center gap-3">
			<div className="flex items-center gap-1 flex-shrink-0">
				{TRACKER_TYPES.map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => setType(t)}
						className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full border transition-colors ${
							type === t
								? "border-foreground/40 bg-foreground/10 text-foreground"
								: "border-border text-muted-foreground hover:border-foreground/30"
						}`}
					>
						<span>{TYPE_EMOJI[t]}</span>
						<span>{shortLabel[t]}</span>
					</button>
				))}
			</div>
			<div className="w-px h-4 bg-border flex-shrink-0" />
			<input
				ref={inputRef}
				value={name}
				onChange={(e) => setName(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") handleSubmit();
					if (e.key === "Escape") onCancel();
				}}
				className="flex-1 bg-transparent border-none outline-none text-foreground text-sm"
			/>
			<button
				type="button"
				onClick={onCancel}
				className="text-[12px] text-muted-foreground hover:text-foreground transition-colors px-1 flex-shrink-0"
			>
				Cancel
			</button>
			<button
				onClick={handleSubmit}
				disabled={saving || !name.trim()}
				type="button"
				className="p-1.5 hover:bg-accent rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
			>
				<Send className="w-4 h-4 text-[#8b9a6b]" />
			</button>
		</div>
	);
}

// ─── Tracker Row ──────────────────────────────────────────────────────────────

interface TrackerRowProps {
	tracker: Tracker;
	isExpanded: boolean;
	tasks: Task[] | undefined;
	isLoadingTasks: boolean;
	onToggleExpand: (id: string) => void;
	onComplete: (id: string) => void;
	onUncomplete: (id: string) => void;
	onDelete: (id: string) => void;
	onEdit: (tracker: Tracker) => void;
}

function TrackerRow({
	tracker,
	isExpanded,
	tasks,
	isLoadingTasks,
	onToggleExpand,
	onComplete,
	onUncomplete,
	onDelete,
	onEdit,
}: TrackerRowProps) {
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const agg = tasks ? aggregateTasks(tasks) : null;
	const activeTasks = tasks?.filter(
		(t) => t.status === "active" || t.status === "in-progress",
	);
	const completedTasks = tasks?.filter((t) => t.status === "completed");

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: tracker.id, disabled: tracker.completed });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
	};

	return (
		<li
			ref={setNodeRef}
			style={style}
			className={`border-b border-border ${tracker.completed ? "opacity-60" : ""}`}
		>
			<div
				className={`flex items-center gap-2.5 px-3 py-2.5 group hover:bg-accent/50 transition-colors cursor-pointer rounded-lg ${
					isExpanded ? "bg-accent/30" : ""
				}`}
				onClick={() => onToggleExpand(tracker.id)}
			>
				{!tracker.completed && (
					<button
						{...attributes}
						{...listeners}
						type="button"
						className="cursor-grab active:cursor-grabbing p-1 touch-none select-none flex-shrink-0"
						aria-label="Drag to reorder"
					>
						<GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
					</button>
				)}

				<button
					onClick={(e) => {
						e.stopPropagation();
						tracker.completed
							? onUncomplete(tracker.id)
							: onComplete(tracker.id);
					}}
					className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
						tracker.completed
							? "bg-foreground/20 border-foreground/30"
							: "border-border hover:border-foreground/40"
					}`}
				>
					{tracker.completed && (
						<Check className="w-2.5 h-2.5 text-foreground" />
					)}
				</button>

				<div className="flex-1 min-w-0 flex items-center gap-2">
					<span
						className={`text-sm truncate ${
							tracker.completed
								? "line-through text-muted-foreground"
								: "text-foreground"
						}`}
					>
						{tracker.name}
					</span>
					<span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
						{TYPE_LABELS[tracker.type]}
					</span>
				</div>

				{agg && agg.count > 0 && (
					<div className="flex items-center gap-1.5 flex-shrink-0">
						<span className="text-[10px] px-1.5 py-0.5 rounded border border-muted-foreground/20 text-muted-foreground/60">
							{agg.count} task{agg.count !== 1 ? "s" : ""}
						</span>
						{agg.totalMs > 0 && (
							<span className="text-[10px] px-1.5 py-0.5 rounded border border-muted-foreground/20 text-muted-foreground/60">
								{formatTimeCompact(agg.totalMs)}
							</span>
						)}
					</div>
				)}

				<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
					<button
						onClick={(e) => {
							e.stopPropagation();
							onEdit(tracker);
						}}
						className="p-1 rounded hover:bg-accent transition-colors"
						title="Edit"
					>
						<Pencil className="w-3 h-3 text-muted-foreground" />
					</button>
					{showDeleteConfirm ? (
						<button
							onClick={(e) => {
								e.stopPropagation();
								onDelete(tracker.id);
								setShowDeleteConfirm(false);
							}}
							className="px-1.5 py-0.5 text-[10px] bg-destructive/20 text-destructive hover:bg-destructive/30 rounded transition-colors"
						>
							Yes
						</button>
					) : (
						<button
							onClick={(e) => {
								e.stopPropagation();
								setShowDeleteConfirm(true);
								setTimeout(() => setShowDeleteConfirm(false), 3000);
							}}
							className="p-1 rounded hover:bg-accent transition-colors"
							title="Delete"
						>
							<Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
						</button>
					)}
				</div>

				<ChevronDown
					className={`w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0 transition-transform ${
						isExpanded ? "rotate-180" : ""
					}`}
				/>
			</div>

			<AnimatePresence>
				{isExpanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.18, ease: "easeInOut" }}
						className="overflow-hidden"
					>
						<div className="ml-6 mr-2 mb-2 border-l border-border pl-3 space-y-0.5">
							{isLoadingTasks && (
								<p className="text-[12px] text-muted-foreground py-2">
									Loading...
								</p>
							)}
							{!isLoadingTasks && (!tasks || tasks.length === 0) && (
								<p className="text-[12px] text-muted-foreground py-2">
									No tasks linked yet. Use{" "}
									<code className="bg-muted px-1 rounded">
										&gt;{tracker.name.split(" ")[0].toLowerCase()}
									</code>{" "}
									in the task input.
								</p>
							)}
							{activeTasks && activeTasks.length > 0 && (
								<React.Fragment key={tracker.id}>
									<p className="text-[10px] text-muted-foreground/50 pt-1.5 pb-0.5 uppercase tracking-wide">
										Active
									</p>
									{activeTasks.map((task) => (
										<TaskLine key={task.id} task={task} />
									))}
								</React.Fragment>
							)}
							{completedTasks && completedTasks.length > 0 && (
								<>
									<p className="text-[10px] text-muted-foreground/50 pt-1.5 pb-0.5 uppercase tracking-wide">
										Completed
									</p>
									{completedTasks.map((task) => (
										<TaskLine key={task.id} task={task} />
									))}
								</>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</li>
	);
}

// ─── Task Line ────────────────────────────────────────────────────────────────

function TaskLine({ task }: { task: Task }) {
	const isCompleted = task.status === "completed";
	return (
		<div className="flex items-center gap-2 py-1">
			<div
				className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
					isCompleted ? "bg-muted-foreground/30" : "bg-[#8b9a6b]/70"
				}`}
			/>
			<span
				className={`text-[12px] flex-1 min-w-0 truncate ${
					isCompleted
						? "line-through text-muted-foreground/50"
						: "text-muted-foreground"
				}`}
			>
				{task.text}
			</span>
			<div className="flex items-center gap-1 flex-shrink-0">
				{task.total_time_ms > 0 && (
					<span className="text-[10px] text-muted-foreground/40">
						{formatTimeCompact(task.total_time_ms)}
					</span>
				)}
				<span className="text-[10px] text-muted-foreground/30">
					{getTaskAge(task.added_at)}
				</span>
			</div>
		</div>
	);
}

// ─── Gallery Card ──────────────────────────────────────────────────────────────

function GalleryCard({
	tracker,
	agg,
	onToggleExpand,
	onComplete,
	onUncomplete,
	onEdit,
	onDelete,
}: {
	tracker: Tracker;
	agg: { count: number; totalMs: number };
	onToggleExpand: (id: string) => void;
	onComplete: (id: string) => void;
	onUncomplete: (id: string) => void;
	onEdit: (tracker: Tracker) => void;
	onDelete: (id: string) => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: tracker.id, disabled: tracker.completed });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			onClick={() => onToggleExpand(tracker.id)}
			className={`relative flex flex-col gap-2 p-3 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors cursor-pointer ${tracker.completed ? "opacity-60" : ""}`}
		>
			<div className="flex items-start justify-between gap-1">
				<p
					className={`text-sm font-medium leading-snug line-clamp-2 flex items-center gap-1.5 ${tracker.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
				>
					<span className="text-base leading-none flex-shrink-0">
						{TYPE_EMOJI[tracker.type]}
					</span>
					{tracker.name}
				</p>
				<button
					onClick={(e) => {
						e.stopPropagation();
						tracker.completed
							? onUncomplete(tracker.id)
							: onComplete(tracker.id);
					}}
					className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors mt-0.5 ${tracker.completed ? "bg-foreground/20 border-foreground/30" : "border-border hover:border-foreground/40"}`}
				>
					{tracker.completed && (
						<Check className="w-2.5 h-2.5 text-foreground" />
					)}
				</button>
			</div>

			<div className="mt-auto flex flex-wrap gap-1">
				{agg.count > 0 && (
					<span className="text-[10px] px-1.5 py-0.5 rounded border border-muted-foreground/20 text-muted-foreground/60">
						{agg.count} task{agg.count !== 1 ? "s" : ""}
					</span>
				)}
				{agg.totalMs > 0 && (
					<span className="text-[10px] px-1.5 py-0.5 rounded border border-muted-foreground/20 text-muted-foreground/60">
						{formatTimeCompact(agg.totalMs)}
					</span>
				)}
			</div>
			<div className="flex items-center gap-1">
				<button
					onClick={(e) => {
						e.stopPropagation();
						onEdit(tracker);
					}}
					className="p-1 rounded hover:bg-accent transition-colors"
				>
					<Pencil className="w-3 h-3 text-muted-foreground" />
				</button>
				<button
					onClick={(e) => {
						e.stopPropagation();
						onDelete(tracker.id);
					}}
					className="p-1 rounded hover:bg-accent transition-colors"
				>
					<Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
				</button>
			</div>
		</div>
	);
}

// ─── Main View ────────────────────────────────────────────────────────────────

interface TrackerViewProps {
	typeFilter: TrackerType | "all";
	viewType: TrackerViewType;
}

export function TrackerView({ typeFilter, viewType }: TrackerViewProps) {
	const {
		trackers,
		isLoading,
		expandedId,
		trackerTasks,
		loadingTasksFor,
		handleCreate,
		handleUpdate,
		handleComplete,
		handleUncomplete,
		handleDelete,
		handleToggleExpand,
		handleReorder,
	} = useTracker();

	const [editingTracker, setEditingTracker] = useState<Tracker | null>(null);

	const filtered = trackers.filter(
		(t) => typeFilter === "all" || t.type === typeFilter,
	);
	const active = filtered.filter((t) => !t.completed);
	const completed = filtered.filter((t) => t.completed);

	const [collapsedTypes, setCollapsedTypes] = useState<Set<TrackerType>>(
		new Set(),
	);

	const [activeDragId, setActiveDragId] = useState<string | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 150, tolerance: 5 },
		}),
	);

	const toggleTypeGroup = (type: TrackerType) => {
		setCollapsedTypes((prev) => {
			const next = new Set(prev);
			next.has(type) ? next.delete(type) : next.add(type);
			return next;
		});
	};

	const activeByType = TRACKER_TYPES.map((type) => ({
		type,
		items: active.filter((t) => t.type === type),
	})).filter(({ items }) => items.length > 0);

	// Pre-select type in the floating input when a specific filter is active
	const defaultInputType: TrackerType =
		typeFilter === "all" ? "book" : typeFilter;

	return (
		<div className="flex-1 flex flex-col min-h-0">
			{/* Scrollable list — pb-24 so content never hides behind the floating bar */}
			{viewType === "board" && (
				<div
					className="flex-1 overflow-x-auto overflow-y-hidden px-2 py-2 pb-24"
					style={{ scrollbarWidth: "thin" }}
				>
					<div className="flex gap-3 h-full min-w-max">
						{TRACKER_TYPES.filter((type) =>
							typeFilter === "all" ? true : type === typeFilter,
						).map((type) => {
							const items = active.filter((t) => t.type === type);
							const completedItems = completed.filter((t) => t.type === type);
							if (items.length === 0 && completedItems.length === 0)
								return null;
							return (
								<div
									key={type}
									className="flex flex-col w-[500px] flex-shrink-0 bg-accent/20 rounded-xl p-2 gap-1"
								>
									<p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide px-2 py-1">
										{TYPE_LABELS[type]} ({items.length})
									</p>
									<div
										className="flex-1 overflow-y-auto space-y-0.5"
										style={{ scrollbarWidth: "thin" }}
									>
										<ul className="space-y-0.5">
											{items.map((tracker) => (
												<React.Fragment key={tracker.id}>
													{editingTracker?.id === tracker.id ? (
														<li className="mb-1 px-1">
															<TrackerEditForm
																initial={{
																	name: tracker.name,
																	type: tracker.type,
																}}
																onSave={async (name, type) => {
																	await handleUpdate(tracker.id, {
																		name,
																		type,
																	});
																	setEditingTracker(null);
																}}
																onCancel={() => setEditingTracker(null)}
															/>
														</li>
													) : (
														<TrackerRow
															tracker={tracker}
															isExpanded={expandedId === tracker.id}
															tasks={trackerTasks.get(tracker.id)}
															isLoadingTasks={loadingTasksFor.has(tracker.id)}
															onToggleExpand={handleToggleExpand}
															onComplete={handleComplete}
															onUncomplete={handleUncomplete}
															onDelete={handleDelete}
															onEdit={setEditingTracker}
														/>
													)}
												</React.Fragment>
											))}
										</ul>
										{completedItems.length > 0 && (
											<>
												<p className="text-[10px] text-muted-foreground/40 uppercase tracking-wide px-2 pt-2 pb-0.5">
													Done
												</p>
												<ul className="space-y-0.5">
													{completedItems.map((tracker) => (
														<TrackerRow
															key={tracker.id}
															tracker={tracker}
															isExpanded={expandedId === tracker.id}
															tasks={trackerTasks.get(tracker.id)}
															isLoadingTasks={loadingTasksFor.has(tracker.id)}
															onToggleExpand={handleToggleExpand}
															onComplete={handleComplete}
															onUncomplete={handleUncomplete}
															onDelete={handleDelete}
															onEdit={setEditingTracker}
														/>
													))}
												</ul>
											</>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{viewType === "gallery" && (
				<div
					className="flex-1 overflow-y-auto px-2 py-2 pb-24"
					style={{ scrollbarWidth: "thin" }}
				>
					{typeFilter !== "all" ? (
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
							{[...active, ...completed].map((tracker) => {
								const tasks = trackerTasks.get(tracker.id) ?? [];
								const agg = aggregateTasks(tasks);
								return (
									<GalleryCard
										key={tracker.id}
										tracker={tracker}
										agg={agg}
										onToggleExpand={handleToggleExpand}
										onComplete={handleComplete}
										onUncomplete={handleUncomplete}
										onEdit={setEditingTracker}
										onDelete={handleDelete}
									/>
								);
							})}
						</div>
					) : (
						<div className="space-y-4">
							{activeByType.map(({ type, items }) => {
								const isCollapsed = collapsedTypes.has(type);
								return (
									<div key={type}>
										<button
											type="button"
											onClick={() => toggleTypeGroup(type)}
											className="flex items-center gap-1.5 w-full px-1 py-1 text-[11px] text-muted-foreground/60 uppercase tracking-wide hover:text-muted-foreground transition-colors"
										>
											<ChevronDown
												className={`w-3 h-3 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
											/>
											{TYPE_LABELS[type]}
											<span className="ml-1 normal-case tracking-normal">
												({items.length})
											</span>
										</button>
										<AnimatePresence initial={false}>
											{!isCollapsed && (
												<motion.div
													key="gallery-group"
													initial={{ height: 0, opacity: 0 }}
													animate={{ height: "auto", opacity: 1 }}
													exit={{ height: 0, opacity: 0 }}
													transition={{ duration: 0.18, ease: "easeInOut" }}
													className="overflow-hidden"
												>
													<DndContext
														sensors={sensors}
														collisionDetection={closestCenter}
														onDragStart={(e) =>
															setActiveDragId(e.active.id as string)
														}
														onDragEnd={async (e) => {
															setActiveDragId(null);
															const { active, over } = e;
															if (!over || active.id === over.id) return;
															await handleReorder(
																active.id as string,
																over.id as string,
															);
														}}
													>
														<SortableContext
															items={items.map((t) => t.id)}
															strategy={verticalListSortingStrategy}
														>
															<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
																{items.map((tracker) => {
																	const tasks =
																		trackerTasks.get(tracker.id) ?? [];
																	const agg = aggregateTasks(tasks);
																	return (
																		<GalleryCard
																			key={tracker.id}
																			tracker={tracker}
																			agg={agg}
																			onToggleExpand={handleToggleExpand}
																			onComplete={handleComplete}
																			onUncomplete={handleUncomplete}
																			onEdit={setEditingTracker}
																			onDelete={handleDelete}
																		/>
																	);
																})}
															</div>
														</SortableContext>
														<DragOverlay>
															{activeDragId &&
																(() => {
																	const t = items.find(
																		(x) => x.id === activeDragId,
																	);
																	if (!t) return null;
																	return (
																		<div className="bg-card border border-border rounded-xl p-3 shadow-lg text-sm opacity-90 flex items-center gap-2">
																			<span>{TYPE_EMOJI[t.type]}</span>
																			<span>{t.name}</span>
																		</div>
																	);
																})()}
														</DragOverlay>
													</DndContext>
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								);
							})}
							{completed.length > 0 && (
								<div>
									<p className="text-[11px] text-muted-foreground/50 uppercase tracking-wide px-1 py-1">
										Completed
									</p>
									<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
										{completed.map((tracker) => {
											const tasks = trackerTasks.get(tracker.id) ?? [];
											const agg = aggregateTasks(tasks);
											return (
												<GalleryCard
													key={tracker.id}
													tracker={tracker}
													agg={agg}
													onToggleExpand={handleToggleExpand}
													onComplete={handleComplete}
													onUncomplete={handleUncomplete}
													onEdit={setEditingTracker}
													onDelete={handleDelete}
												/>
											);
										})}
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			)}

			{viewType === "flow" && (
				<div
					className="flex-1 overflow-y-auto px-2 py-2 pb-24 space-y-0.5"
					style={{ scrollbarWidth: "thin" }}
				>
					{isLoading && (
						<p className="text-sm text-muted-foreground px-3 py-4">
							Loading...
						</p>
					)}

					{!isLoading && trackers.length === 0 && (
						<div className="px-3 py-8 text-center space-y-1">
							<p className="text-sm text-muted-foreground">No trackers yet.</p>
							<p className="text-[12px] text-muted-foreground/60">
								Add a book, course, or project using the input below.
							</p>
						</div>
					)}

					{/* Active trackers */}
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragStart={(e) => setActiveDragId(e.active.id as string)}
						onDragEnd={async (e) => {
							setActiveDragId(null);
							const { active, over } = e;
							if (!over || active.id === over.id) return;
							await handleReorder(active.id as string, over.id as string);
						}}
					>
						<SortableContext
							items={active.map((t) => t.id)}
							strategy={verticalListSortingStrategy}
						>
							{typeFilter !== "all" ? (
								<ul className="space-y-0.5">
									{active.map((tracker) => (
										<React.Fragment key={tracker.id}>
											{editingTracker?.id === tracker.id ? (
												<li className="mb-1 px-1">
													<TrackerEditForm
														initial={{ name: tracker.name, type: tracker.type }}
														onSave={async (name, type) => {
															await handleUpdate(tracker.id, { name, type });
															setEditingTracker(null);
														}}
														onCancel={() => setEditingTracker(null)}
													/>
												</li>
											) : (
												<TrackerRow
													tracker={tracker}
													isExpanded={expandedId === tracker.id}
													tasks={trackerTasks.get(tracker.id)}
													isLoadingTasks={loadingTasksFor.has(tracker.id)}
													onToggleExpand={handleToggleExpand}
													onComplete={handleComplete}
													onUncomplete={handleUncomplete}
													onDelete={handleDelete}
													onEdit={setEditingTracker}
												/>
											)}
										</React.Fragment>
									))}
								</ul>
							) : (
								<div className="space-y-1">
									{activeByType.map(({ type, items }) => {
										const isCollapsed = collapsedTypes.has(type);
										return (
											<div key={type}>
												<button
													type="button"
													onClick={() => toggleTypeGroup(type)}
													className="flex items-center gap-1.5 w-full px-3 py-1 text-[11px] text-muted-foreground/60 uppercase tracking-wide hover:text-muted-foreground transition-colors"
												>
													<ChevronDown
														className={`w-3 h-3 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
													/>
													{TYPE_LABELS[type]}
													<span className="ml-1 normal-case tracking-normal">
														({items.length})
													</span>
												</button>
												<AnimatePresence initial={false}>
													{!isCollapsed && (
														<motion.ul
															key="group"
															initial={{ height: 0, opacity: 0 }}
															animate={{ height: "auto", opacity: 1 }}
															exit={{ height: 0, opacity: 0 }}
															transition={{ duration: 0.18, ease: "easeInOut" }}
															className="overflow-hidden space-y-0.5"
														>
															{items.map((tracker) => (
																<React.Fragment key={tracker.id}>
																	{editingTracker?.id === tracker.id ? (
																		<li className="mb-1 px-1">
																			<TrackerEditForm
																				initial={{
																					name: tracker.name,
																					type: tracker.type,
																				}}
																				onSave={async (name, type) => {
																					await handleUpdate(tracker.id, {
																						name,
																						type,
																					});
																					setEditingTracker(null);
																				}}
																				onCancel={() => setEditingTracker(null)}
																			/>
																		</li>
																	) : (
																		<TrackerRow
																			tracker={tracker}
																			isExpanded={expandedId === tracker.id}
																			tasks={trackerTasks.get(tracker.id)}
																			isLoadingTasks={loadingTasksFor.has(
																				tracker.id,
																			)}
																			onToggleExpand={handleToggleExpand}
																			onComplete={handleComplete}
																			onUncomplete={handleUncomplete}
																			onDelete={handleDelete}
																			onEdit={setEditingTracker}
																		/>
																	)}
																</React.Fragment>
															))}
														</motion.ul>
													)}
												</AnimatePresence>
											</div>
										);
									})}
								</div>
							)}

							{/* Completed trackers */}
							{completed.length > 0 && (
								<div className="mt-3">
									<p className="text-[10px] text-muted-foreground/50 uppercase tracking-wide px-3 pb-1">
										Completed
									</p>
									<ul className="space-y-0.5">
										{completed.map((tracker) => (
											<TrackerRow
												key={tracker.id}
												tracker={tracker}
												isExpanded={expandedId === tracker.id}
												tasks={trackerTasks.get(tracker.id)}
												isLoadingTasks={loadingTasksFor.has(tracker.id)}
												onToggleExpand={handleToggleExpand}
												onComplete={handleComplete}
												onUncomplete={handleUncomplete}
												onDelete={handleDelete}
												onEdit={setEditingTracker}
											/>
										))}
									</ul>
								</div>
							)}
						</SortableContext>
						<DragOverlay>
							{activeDragId &&
								(() => {
									const t = trackers.find((x) => x.id === activeDragId);
									if (!t) return null;
									return (
										<div className="bg-card border border-border rounded-lg px-3 py-2.5 shadow-lg text-sm opacity-90">
											{TYPE_EMOJI[t.type]} {t.name}
										</div>
									);
								})()}
						</DragOverlay>
					</DndContext>
				</div>
			)}

			{/* Floating input — always visible, matches TaskInput exactly */}
			<TrackerInput defaultType={defaultInputType} onSave={handleCreate} />
		</div>
	);
}
