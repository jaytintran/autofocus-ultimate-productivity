"use client";

import { useState, useRef, useEffect } from "react";
import {
	Play,
	Check,
	RefreshCw,
	Trash2,
	FolderInput,
	Tag,
	ChevronUp,
	ChevronDown,
	Clock,
	History,
} from "lucide-react";
import type { Task, Pamphlet } from "@/lib/types";
import type { TagId } from "@/lib/tags";
import { TAG_DEFINITIONS } from "@/lib/tags";
import {
	formatTimeCompact,
	getTaskAge,
	formatDueDateVerbose,
} from "@/lib/utils/time-utils";
import {
	formatDueDate,
	parseDueDateShortcut,
} from "@/lib/utils/due-date-parser";
import { DueDatePicker } from "@/components/shared/due-date-picker";

interface TaskActionDrawerProps {
	task: Task;
	isOpen: boolean;
	onClose: () => void;
	isFirst: boolean;
	isLast: boolean;
	pamphlets: Pamphlet[];
	activePamphletId: string | null;
	onStart: (task: Task) => void;
	onDone: (task: Task) => void;
	onReenter: (task: Task) => void;
	onDelete: (taskId: string) => void;
	onPump: (taskId: string) => void;
	onSink: (taskId: string) => void;
	onUpdateTag: (taskId: string, tag: TagId | null) => void;
	onMoveTask: (taskId: string, toPamphletId: string) => void;
	onEdit: () => void;
	onUpdateDueDate: (taskId: string, dueDate: string | null) => void;
	onUpdateText: (taskId: string, text: string, dueDate?: string) => void;
}

export function TaskActionDrawer({
	task,
	isOpen,
	onClose,
	isFirst,
	isLast,
	pamphlets,
	activePamphletId,
	onStart,
	onDone,
	onReenter,
	onDelete,
	onPump,
	onSink,
	onUpdateTag,
	onMoveTask,
	onEdit,
	onUpdateDueDate,
	onUpdateText,
}: TaskActionDrawerProps) {
	const [showTagDropdown, setShowTagDropdown] = useState(false);
	const [showPamphletSubmenu, setShowPamphletSubmenu] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [dueDatePickerOpen, setDueDatePickerOpen] = useState(false);
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [editText, setEditText] = useState(task.text);

	const inputRef = useRef<HTMLInputElement>(null);
	const tagDropdownRef = useRef<HTMLDivElement>(null);

	// Sync edit text when task changes
	useEffect(() => {
		setEditText(task.text);
	}, [task.text]);

	// Auto-focus when entering edit mode
	useEffect(() => {
		if (isEditingTitle && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditingTitle]);

	// Close tag dropdown when clicking outside
	useEffect(() => {
		if (!showTagDropdown) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (
				tagDropdownRef.current &&
				!tagDropdownRef.current.contains(e.target as Node)
			) {
				setShowTagDropdown(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [showTagDropdown]);

	const handleAction = (action: () => void) => {
		action();
		onClose();
	};

	const handleSaveTitle = () => {
		const trimmed = editText.trim();
		if (!trimmed) {
			setEditText(task.text);
			setIsEditingTitle(false);
			return;
		}
		const { cleanText, dueDate } = parseDueDateShortcut(trimmed);
		const finalText = cleanText || trimmed;
		if (finalText !== task.text || dueDate !== null) {
			onUpdateText(
				task.id,
				finalText,
				dueDate ? dueDate.toISOString() : undefined,
			);
		}
		setIsEditingTitle(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === "Escape") {
			e.preventDefault();
			handleSaveTitle();
		}
	};

	const otherPamphlets = pamphlets.filter((p) => p.id !== activePamphletId);

	const currentTag = task.tag
		? TAG_DEFINITIONS.find((t) => t.id === task.tag)
		: null;

	const dueDateClasses = task.due_date
		? (() => {
				const { urgency } = formatDueDate(task.due_date);
				return {
					overdue: "border-red-500/40 bg-red-500/10 text-red-500",
					soon: "border-amber-500/40 bg-amber-500/10 text-amber-500",
					normal:
						"border-muted-foreground/30 bg-muted/50 text-muted-foreground",
					far: "border-muted-foreground/20 bg-transparent text-muted-foreground/50",
				}[urgency];
			})()
		: "";

	if (!isOpen) return null;

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/50 z-40"
				onClick={onClose}
				style={{ touchAction: "none" }}
			/>

			{/* Drawer */}
			<div
				className="fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl z-50 flex flex-col"
				style={{ height: "50vh", touchAction: "pan-y" }}
			>
				{/* Drag handle - Fixed header */}
				<div className="flex justify-center py-3 border-b border-border flex-shrink-0">
					<div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
				</div>

				{/* Task title - Fixed header */}
				<div className="px-4 border-b border-border flex-shrink-0 py-3">
					{isEditingTitle ? (
						<input
							ref={inputRef}
							type="text"
							value={editText}
							onChange={(e) => setEditText(e.target.value)}
							onBlur={handleSaveTitle}
							onKeyDown={handleKeyDown}
							placeholder="Task text… or append !1d, !2h, !30m"
							className="w-full bg-transparent outline-none text-sm text-foreground/80 border-0 block"
							style={{ margin: 0, padding: 0 }}
						/>
					) : (
						<p
							onClick={() => setIsEditingTitle(true)}
							className="text-sm text-foreground/80 cursor-text m-0 break-words overflow-wrap-anywhere"
						>
							{task.text}
						</p>
					)}
				</div>

				{/* Scrollable content */}
				<div className="overflow-y-auto flex-1">
					{/* Info section */}
					<div className="py-2 border-b border-border">
						<div className="px-4 py-2">
							<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								Info
							</p>
						</div>

						{/* Tag with mini dropdown */}
						<div className="flex items-center justify-between px-4 py-2">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Tag className="w-4 h-4" />
								<span>Tag</span>
							</div>
							<div className="relative" ref={tagDropdownRef}>
								<button
									onClick={() => setShowTagDropdown(!showTagDropdown)}
									className="text-sm px-2 py-1 rounded border border-muted-foreground/30 hover:bg-accent transition-colors"
								>
									{currentTag ? (
										<span>
											{currentTag.emoji} {currentTag.label}
										</span>
									) : (
										<span className="text-muted-foreground/50">No tag</span>
									)}
								</button>

								{showTagDropdown && (
									<div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
										<button
											onClick={() => {
												onUpdateTag(task.id, null);
												setShowTagDropdown(false);
											}}
											className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors text-left"
										>
											<span className="text-sm">No tag</span>
										</button>
										{TAG_DEFINITIONS.map((tag) => (
											<button
												key={tag.id}
												onClick={() => {
													onUpdateTag(task.id, tag.id);
													setShowTagDropdown(false);
												}}
												className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors text-left"
											>
												<span className="text-base">{tag.emoji}</span>
												<span className="text-sm">{tag.label}</span>
											</button>
										))}
									</div>
								)}
							</div>
						</div>

						{/* Due date */}
						<div className="flex items-center justify-between px-4 py-2">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Clock className="w-4 h-4" />
								<span>Due date</span>
							</div>
							<div className="relative">
								<button
									onClick={() => setDueDatePickerOpen(!dueDatePickerOpen)}
									className={`text-xs px-2 py-1 rounded border transition-colors ${
										task.due_date
											? dueDateClasses
											: "border-dashed border-muted-foreground/30 text-muted-foreground/50 hover:border-muted-foreground/50"
									}`}
								>
									{task.due_date
										? formatDueDate(task.due_date).label
										: "Set date"}
								</button>

								{dueDatePickerOpen && (
									<DueDatePicker
										currentDueDate={task.due_date}
										onSet={(isoDate) => {
											onUpdateDueDate(task.id, isoDate);
											setDueDatePickerOpen(false);
										}}
										onClose={() => setDueDatePickerOpen(false)}
									/>
								)}
							</div>
						</div>

						{/* Time logged */}
						{task.total_time_ms > 0 && (
							<div className="flex items-center justify-between px-4 py-2">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Clock className="w-4 h-4" />
									<span>Time logged</span>
								</div>
								<div className="text-sm text-muted-foreground">
									{formatTimeCompact(task.total_time_ms)}
								</div>
							</div>
						)}

						{/* Age */}
						<div className="flex items-center justify-between px-4 py-2">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<History className="w-4 h-4" />
								<span>Age</span>
							</div>
							<div className="text-sm text-muted-foreground">
								{getTaskAge(task.added_at)}
							</div>
						</div>

						{/* Re-entered indicator */}
						{task.re_entered_from && (
							<div className="flex items-center justify-between px-4 py-2">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<RefreshCw className="w-4 h-4" />
									<span>Status</span>
								</div>
								<div className="text-xs px-2 py-1 rounded border border-[#c49a6b]/40 bg-[#c49a6b]/10 text-[#c49a6b]">
									Re-entered
								</div>
							</div>
						)}
					</div>

					{/* Actions section */}
					<div className="py-2 border-b border-border">
						<div className="px-4 py-2">
							<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								Actions
							</p>
						</div>

						<button
							onClick={() => handleAction(() => onStart(task))}
							className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent transition-colors"
						>
							<Play className="w-5 h-5 text-[#8b9a6b]" />
							<span className="text-sm">Start working</span>
						</button>

						<button
							onClick={() => handleAction(() => onDone(task))}
							className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent transition-colors"
						>
							<Check className="w-5 h-5 text-[#8b9a6b]" />
							<span className="text-sm">Mark as done</span>
						</button>

						<button
							onClick={() => handleAction(() => onReenter(task))}
							className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent transition-colors"
						>
							<RefreshCw className="w-5 h-5 text-[#c49a6b]" />
							<span className="text-sm">Re-enter at end</span>
						</button>

						{/* Move to pamphlet */}
						{otherPamphlets.length > 0 && (
							<>
								<button
									onClick={() => setShowPamphletSubmenu(!showPamphletSubmenu)}
									className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent transition-colors"
								>
									<FolderInput className="w-5 h-5 text-muted-foreground" />
									<span className="text-sm">Move to pamphlet</span>
								</button>

								{showPamphletSubmenu && (
									<div className="bg-accent/50 py-2">
										{otherPamphlets.map((pamphlet) => (
											<button
												key={pamphlet.id}
												onClick={() =>
													handleAction(() => onMoveTask(task.id, pamphlet.id))
												}
												className="w-full flex items-center gap-3 px-8 py-2 hover:bg-accent active:bg-accent transition-colors"
											>
												<span className="text-sm">{pamphlet.name}</span>
											</button>
										))}
									</div>
								)}
							</>
						)}
					</div>

					{/* Reorder section */}
					{(!isFirst || !isLast) && (
						<div className="py-2 border-b border-border">
							<div className="px-4 py-2">
								<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Reorder
								</p>
							</div>

							{!isFirst && (
								<button
									onClick={() => handleAction(() => onPump(task.id))}
									className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent transition-colors"
								>
									<ChevronUp className="w-5 h-5 text-muted-foreground" />
									<span className="text-sm">Move to top</span>
								</button>
							)}

							{!isLast && (
								<button
									onClick={() => handleAction(() => onSink(task.id))}
									className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent transition-colors"
								>
									<ChevronDown className="w-5 h-5 text-muted-foreground" />
									<span className="text-sm">Move to bottom</span>
								</button>
							)}
						</div>
					)}

					{/* Delete section */}
					<div className="py-2">
						{showDeleteConfirm ? (
							<div className="px-4 py-3">
								<p className="text-sm text-destructive mb-3">
									Delete this task?
								</p>
								<div className="flex gap-2">
									<button
										onClick={() => setShowDeleteConfirm(false)}
										className="flex-1 px-4 py-2 text-sm border border-border rounded hover:bg-accent transition-colors"
									>
										Cancel
									</button>
									<button
										onClick={() => handleAction(() => onDelete(task.id))}
										className="flex-1 px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
									>
										Delete
									</button>
								</div>
							</div>
						) : (
							<button
								onClick={() => setShowDeleteConfirm(true)}
								className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent transition-colors"
							>
								<Trash2 className="w-5 h-5 text-destructive" />
								<span className="text-sm text-destructive">Delete task</span>
							</button>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
