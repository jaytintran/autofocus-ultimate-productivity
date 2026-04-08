// timer-bar.tsx
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
	Pause,
	Play,
	Square,
	Check,
	RefreshCw,
	X,
	Send,
	KeyboardIcon,
	ClipboardList,
	Trophy,
	CheckCheck,
	Loader2,
} from "lucide-react";
import type { Task, AppState, Pamphlet } from "@/lib/types";
import { TAG_DEFINITIONS, getTagDefinition, type TagId } from "@/lib/tags";
import { formatTimeCompact } from "@/lib/utils/time-utils";
import {
	formatDueDate,
	parseDueDateShortcut,
} from "@/lib/utils/due-date-parser";
import { PAMPHLET_COLORS } from "@/lib/features/pamphlet-colors";
import { TagPill } from "@/components/shared/tag-pill";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface NoteEntry {
	id: string;
	elapsedMs: number;
	text: string;
	type: "log" | "achievement" | "sidequest";
}

interface TimerBarProps {
	appState: AppState;
	workingTask: Task | null;
	onStartTimer: () => Promise<void>;
	onPauseTimer: (sessionMs: number) => Promise<void>;
	onResumeTimer: () => Promise<void>;
	onStopTimer: (task: Task, sessionMs: number) => Promise<void>;
	onCancelTask: (task: Task, sessionMs: number) => Promise<void>;
	onCompleteTask: (
		task: Task,
		sessionMs: number,
		note: string,
	) => Promise<void>;
	onReenterTask: (task: Task, note?: string) => Promise<void>;
	onAddTask: (text: string, tag?: TagId | null) => Promise<Task | null>;
	onStartTask: (task: Task) => Promise<void>;
	activeTasks: Task[];
	onAddTaskAndStart: (
		text: string,
		tag?: TagId | null,
		dueDate?: string | null,
	) => Promise<Task | null>;
	pamphlets: Pamphlet[];
	onUpdateDueDate: (taskId: string, dueDate: string | null) => Promise<void>;
	onUpdateTaskTag: (taskId: string, tag: TagId | null) => Promise<void>;
	onCompleteAdjacentTask: (
		taskId: string | null,
		text: string,
	) => Promise<void>;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatTimerDisplay(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

const EXEMPT_WORDS = new Set([
	"a",
	"an",
	"and",
	"of",
	"the",
	"on",
	"to",
	"at",
	"by",
]);

function capitalizeText(text: string): string {
	return text
		.split(" ")
		.map((w, i) =>
			i === 0 || !EXEMPT_WORDS.has(w.toLowerCase())
				? w.charAt(0).toUpperCase() + w.slice(1)
				: w.toLowerCase(),
		)
		.join(" ");
}

const TAG_MENTION_MAP: Record<string, TagId> = Object.fromEntries(
	TAG_DEFINITIONS.map((tag) => [`#${tag.id}`, tag.id]),
);

function parseTagMention(text: string): {
	tag: TagId | null;
	cleanText: string;
} {
	const lower = text.toLowerCase();
	for (const [mention, tagId] of Object.entries(TAG_MENTION_MAP)) {
		const regex = new RegExp(`${mention}(\\s|$)`, "i");
		if (regex.test(lower)) {
			return { tag: tagId, cleanText: text.replace(regex, "").trim() };
		}
	}
	return { tag: null, cleanText: text };
}

// =============================================================================
// STYLES
// =============================================================================

const primaryBtn =
	"items-center justify-center gap-2 rounded-sm border border-[#a3b56a]/40 bg-[#a3b56a] px-4 py-2 text-sm font-medium text-[#1f2414] transition-colors hover:bg-[#b2c777] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryBtn =
	"items-center justify-center gap-2 rounded-sm border border-border bg-transparent px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";
const iconBtn =
	"inline-flex items-center justify-center rounded-sm border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50";

// =============================================================================
// IDLE INPUT COMPONENT
// =============================================================================

function IdleInput({
	activeTasks,
	onAddTaskAndStart,
	onStartTask,
}: {
	activeTasks: Task[];
	onAddTaskAndStart: TimerBarProps["onAddTaskAndStart"];
	onStartTask: TimerBarProps["onStartTask"];
}) {
	const [focusQuery, setFocusQuery] = useState("");
	const [focusInlineTag, setFocusInlineTag] = useState<TagId | null>(null);
	const [focusMentionQuery, setFocusMentionQuery] = useState<string | null>(
		null,
	);
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const t = setTimeout(() => setDebouncedQuery(focusQuery), 400);
		return () => clearTimeout(t);
	}, [focusQuery]);

	const focusMatches = useMemo(
		() =>
			debouncedQuery.trim()
				? activeTasks
						.filter((t) =>
							t.text.toLowerCase().includes(debouncedQuery.toLowerCase()),
						)
						.slice(0, 6)
				: [],
		[debouncedQuery, activeTasks],
	);

	const focusTagDef = focusInlineTag ? getTagDefinition(focusInlineTag) : null;

	const focusMentionResults = useMemo(
		() =>
			focusMentionQuery !== null
				? TAG_DEFINITIONS.filter((t) =>
						t.id.startsWith(focusMentionQuery.toLowerCase()),
					)
				: [],
		[focusMentionQuery],
	);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setFocusQuery(value);
		const mentionMatch = value.match(/#(\w*)$/);
		setFocusMentionQuery(mentionMatch ? mentionMatch[1] : null);
		const { tag } = parseTagMention(value);
		setFocusInlineTag(tag);
	};

	const handleSubmit = useCallback(async () => {
		const trimmed = focusQuery.trim();
		if (!trimmed || submitting) return;

		const { tag, cleanText: tagClean } = parseTagMention(trimmed);
		const { cleanText, dueDate } = parseDueDateShortcut(tagClean || trimmed);
		const finalTag = focusInlineTag ?? tag;
		const finalText = capitalizeText(cleanText || tagClean || trimmed);

		setFocusQuery("");
		setFocusInlineTag(null);
		setFocusMentionQuery(null);
		setSubmitting(true);

		try {
			await onAddTaskAndStart(
				finalText,
				finalTag,
				dueDate ? dueDate.toISOString() : null,
			);
		} finally {
			setSubmitting(false);
		}
	}, [focusQuery, focusInlineTag, submitting, onAddTaskAndStart]);

	const handleSelectExisting = useCallback(
		async (task: Task) => {
			setFocusQuery("");
			setFocusInlineTag(null);
			setFocusMentionQuery(null);
			await onStartTask(task);
		},
		[onStartTask],
	);

	const handleMentionSelect = (tagId: TagId) => {
		setFocusQuery((q) => q.replace(/#\w*$/, "").trim());
		setFocusInlineTag(tagId);
		setFocusMentionQuery(null);
		inputRef.current?.focus();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (focusMentionQuery !== null && focusMentionResults.length === 1) {
				handleMentionSelect(focusMentionResults[0].id);
				return;
			}
			if (focusMatches.length === 1 && focusQuery.trim()) {
				handleSelectExisting(focusMatches[0]);
				return;
			}
			handleSubmit();
		}
		if (e.key === "Escape") setFocusMentionQuery(null);
	};

	const { dueDate: parsedDueDate, dueDateLabel } =
		parseDueDateShortcut(focusQuery);

	return (
		<div className="border-y border-border/80 bg-card px-6 py-6 md:px-10">
			<div className="mx-auto flex max-w-6xl flex-col items-center w-full">
				<div className="relative w-full max-w-2xl">
					{focusMentionQuery !== null && focusMentionResults.length > 0 && (
						<div className="absolute bottom-full mb-2 left-0 bg-card border border-border rounded-xl shadow-lg p-1.5 z-50 min-w-[160px]">
							<p className="text-[10px] text-muted-foreground px-2 py-1">
								Tag as...
							</p>
							{focusMentionResults.map((tag) => (
								<button
									key={tag.id}
									type="button"
									onMouseDown={(e) => {
										e.preventDefault();
										handleMentionSelect(tag.id);
									}}
									className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-lg hover:bg-accent transition-colors text-left"
								>
									<span>{tag.emoji}</span>
									<span>{tag.label}</span>
								</button>
							))}
						</div>
					)}

					<div className="flex items-center gap-3 py-2">
						<KeyboardIcon className="w-5 h-5 text-muted-foreground shrink-0" />

						{focusTagDef && (
							<button
								type="button"
								onClick={() => setFocusInlineTag(null)}
								className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[#8b9a6b]/10 hover:bg-destructive/10 hover:text-destructive transition-colors group flex-shrink-0"
							>
								<span>{focusTagDef.emoji}</span>
								<span>{focusTagDef.label}</span>
								<span className="opacity-0 group-hover:opacity-100 ml-0.5">
									×
								</span>
							</button>
						)}

						<input
							ref={inputRef}
							type="text"
							value={focusQuery}
							onChange={handleChange}
							onKeyDown={handleKeyDown}
							placeholder="What are you working on? Search or create. Use # to tag, ! for due date"
							className="flex-1 bg-transparent border-none outline-none text-lg md:text-xl text-foreground placeholder:text-muted-foreground/50 placeholder:text-sm md:placeholder:text-base"
							autoFocus
							disabled={submitting}
						/>

						{parsedDueDate && (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-500 flex-shrink-0">
								⏰ {dueDateLabel}
							</span>
						)}

						{focusQuery.trim() && !submitting && (
							<button
								type="button"
								onClick={handleSubmit}
								className="p-1.5 hover:bg-accent rounded-full transition-colors flex-shrink-0"
							>
								<Send className="w-4 h-4 text-[#8b9a6b]" />
							</button>
						)}
						{submitting && (
							<div className="w-4 h-4 border-2 border-[#8b9a6b]/30 border-t-[#8b9a6b] rounded-full animate-spin flex-shrink-0" />
						)}
					</div>

					{focusMatches.length > 0 && (
						<div className="absolute top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
							{focusMatches.map((task) => {
								const tagDef = task.tag ? getTagDefinition(task.tag) : null;
								return (
									<button
										key={task.id}
										type="button"
										onClick={() => handleSelectExisting(task)}
										className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left"
									>
										<Play className="w-3 h-3 text-[#8b9a6b] flex-shrink-0" />
										<span className="flex-1 truncate text-foreground">
											{task.text}
										</span>
										{tagDef && (
											<span className="text-xs text-muted-foreground flex-shrink-0">
												{tagDef.emoji} {tagDef.label}
											</span>
										)}
									</button>
								);
							})}
							{focusQuery.trim() && (
								<button
									type="button"
									onClick={handleSubmit}
									className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left border-t border-border text-muted-foreground"
								>
									<Send className="w-3 h-3 flex-shrink-0" />
									<span>Create "{focusQuery.trim()}" and start</span>
								</button>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// =============================================================================
// DUE DATE PICKER COMPONENT
// =============================================================================

function DueDatePicker({
	currentDueDate,
	onSet,
	onClose,
}: {
	currentDueDate: string | null;
	onSet: (isoDate: string | null) => void;
	onClose: () => void;
}) {
	const [customInput, setCustomInput] = useState("");
	const [customError, setCustomError] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	const PRESETS = [
		{ label: "15m", shortcut: "!15m" },
		{ label: "30m", shortcut: "!30m" },
		{ label: "45m", shortcut: "!45m" },
		{ label: "1h", shortcut: "!1h" },
		{ label: "3h", shortcut: "!3h" },
		{ label: "1d", shortcut: "!1d" },
	];

	useEffect(() => {
		const handler = (e: MouseEvent | TouchEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				onClose();
			}
		};
		document.addEventListener("mousedown", handler);
		document.addEventListener("touchstart", handler);
		return () => {
			document.removeEventListener("mousedown", handler);
			document.removeEventListener("touchstart", handler);
		};
	}, [onClose]);

	const handlePreset = (shortcut: string) => {
		const { dueDate } = parseDueDateShortcut(shortcut);
		if (dueDate) {
			onSet(dueDate.toISOString());
			onClose();
		}
	};

	const handleCustomSubmit = () => {
		const input = customInput.trim();
		const normalized = input.startsWith("!") ? input : `!${input}`;
		const { dueDate } = parseDueDateShortcut(normalized);
		if (dueDate) {
			setCustomError(false);
			onSet(dueDate.toISOString());
			onClose();
		} else {
			setCustomError(true);
			setTimeout(() => setCustomError(false), 1200);
		}
	};

	return (
		<div
			ref={menuRef}
			className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl p-3 w-56 flex flex-col gap-2"
		>
			<div className="grid grid-cols-3 gap-1.5">
				{PRESETS.map((p) => (
					<button
						key={p.label}
						onClick={() => handlePreset(p.shortcut)}
						className="px-2 py-1.5 text-xs rounded-lg border border-border hover:bg-accent hover:border-border/80 transition-colors font-medium"
					>
						{p.label}
					</button>
				))}
			</div>

			<div className="h-px bg-border" />

			<div className="flex gap-1.5">
				<input
					autoFocus
					value={customInput}
					onChange={(e) => setCustomInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") handleCustomSubmit();
						if (e.key === "Escape") onClose();
					}}
					placeholder="e.g. 2h30m or 3d"
					className={`flex-1 bg-background border rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring transition-colors ${
						customError ? "border-destructive" : "border-input"
					}`}
				/>
				<button
					onClick={handleCustomSubmit}
					className="px-2 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
				>
					Set
				</button>
			</div>

			{currentDueDate && (
				<button
					onClick={() => {
						onSet(null);
						onClose();
					}}
					className="text-[10px] text-destructive hover:text-destructive/80 transition-colors text-left"
				>
					Clear due date
				</button>
			)}
		</div>
	);
}

// =============================================================================
// ACTION BUTTON COMPONENT
// =============================================================================

/**
 * Single action button with loading state.
 * When active, shows spinner and hides other buttons.
 */
function ActionButton({
	onClick,
	disabled,
	loading,
	variant = "primary",
	icon,
	label,
	title,
	className = "",
}: {
	onClick?: () => void;
	disabled?: boolean;
	loading?: boolean;
	variant?: "primary" | "secondary";
	icon: React.ReactNode;
	label?: string;
	title?: string;
	className?: string;
}) {
	const baseClasses = variant === "primary" ? primaryBtn : secondaryBtn;

	return (
		<button
			onClick={onClick}
			disabled={disabled || loading}
			title={title}
			className={`${baseClasses} ${className} ${loading ? "relative" : ""}`}
		>
			{loading ? (
				<Loader2
					className={`${label ? "h-3.5 w-3.5" : "h-4 w-4"} animate-spin`}
				/>
			) : (
				icon
			)}
			{label && <span>{label}</span>}
		</button>
	);
}

// =============================================================================
// MAIN TIMER BAR COMPONENT
// =============================================================================

export function TimerBar({
	appState,
	workingTask,
	onStartTimer,
	onPauseTimer,
	onResumeTimer,
	onStopTimer,
	onCompleteTask,
	onCancelTask,
	onReenterTask,
	onAddTaskAndStart,
	onStartTask,
	activeTasks,
	pamphlets,
	onUpdateDueDate,
	onUpdateTaskTag,
	onCompleteAdjacentTask,
}: TimerBarProps) {
	// ── Optimistic Working Task State ─────────────────────────────────────────
	// Immediately clears working task on destructive actions (complete/reenter/cancel)
	// to prevent any possibility of double-clicks. Server catch-up happens in background.
	const [optimisticWorkingTask, setOptimisticWorkingTask] = useState<
		Task | null | undefined
	>(undefined);

	const effectiveWorkingTask =
		optimisticWorkingTask !== undefined ? optimisticWorkingTask : workingTask;

	useEffect(() => {
		if (optimisticWorkingTask !== undefined) {
			if (
				workingTask === null ||
				(optimisticWorkingTask === null && workingTask === null)
			) {
				setOptimisticWorkingTask(undefined);
			}
		}
	}, [workingTask, optimisticWorkingTask]);

	// ── Active Operation Tracking ─────────────────────────────────────────────
	// Only for showing spinner on clicked button. UI is already optimistic, so this
	// is just visual feedback, not a lock.
	const [activeOperation, setActiveOperation] = useState<string | null>(null);

	// ── Optimistic Timer State ─────────────────────────────────────────────────
	type OptimisticTimer = "idle" | "running" | "paused" | "stopped" | null;
	const [optimisticTimerState, setOptimisticTimerState] =
		useState<OptimisticTimer>(null);

	useEffect(() => {
		setOptimisticTimerState(null);
	}, [appState.timer_state]);

	const timerState = optimisticTimerState ?? appState.timer_state;
	const isIdle = timerState === "idle";
	const isRunning = timerState === "running";
	const isPaused = timerState === "paused";
	const isStopped = timerState === "stopped";

	// ── Session Timer State ────────────────────────────────────────────────────
	const [sessionMs, setSessionMs] = useState(0);
	const sessionStartRef = useRef<number | null>(null);
	const baseSessionMsRef = useRef(0);

	// ── Notes State ─────────────────────────────────────────────────────────────
	const [noteEntries, setNoteEntries] = useState<NoteEntry[]>([]);
	const [noteInput, setNoteInput] = useState("");
	const [noteType, setNoteType] = useState<"log" | "achievement" | "sidequest">(
		"log",
	);
	const [mobileNotesOpen, setMobileNotesOpen] = useState(false);
	const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
	const [editingNoteText, setEditingNoteText] = useState("");

	// ── Sidequest State ─────────────────────────────────────────────────────────
	const [sidequestInput, setSidequestInput] = useState("");
	const [sidequestMatches, setSidequestMatches] = useState<Task[]>([]);
	const [sidequestSubmitting, setSidequestSubmitting] = useState(false);

	// ── UI State ────────────────────────────────────────────────────────────────
	const [dueDatePickerOpen, setDueDatePickerOpen] = useState(false);
	const [note, setNote] = useState("");

	// ── Timer Interval Effect ───────────────────────────────────────────────────
	useEffect(() => {
		if (!effectiveWorkingTask) {
			setSessionMs(0);
			sessionStartRef.current = null;
			baseSessionMsRef.current = 0;
			setNoteEntries([]);
			setNoteInput("");
			setSidequestInput("");
			setSidequestMatches([]);
			return;
		}

		if (appState.timer_state === "running") {
			const startTime = appState.session_start_time
				? new Date(appState.session_start_time).getTime()
				: Date.now();
			sessionStartRef.current = startTime;
			baseSessionMsRef.current = appState.current_session_ms;

			const interval = setInterval(() => {
				setSessionMs(
					baseSessionMsRef.current + (Date.now() - sessionStartRef.current!),
				);
			}, 100);
			return () => clearInterval(interval);
		} else if (appState.timer_state === "paused") {
			setSessionMs(appState.current_session_ms);
		} else {
			setSessionMs(0);
		}
	}, [
		effectiveWorkingTask,
		appState.timer_state,
		appState.session_start_time,
		appState.current_session_ms,
	]);

	// ── Timer Control Handlers ───────────────────────────────────────────────────
	// Non-destructive: just show spinner on button, no optimistic UI needed

	const handleStartTimer = useCallback(async () => {
		setOptimisticTimerState("running");
		setActiveOperation("start");
		try {
			await onStartTimer();
		} catch {
			setOptimisticTimerState(null);
		} finally {
			setActiveOperation(null);
		}
	}, [onStartTimer]);

	const handlePause = useCallback(async () => {
		setOptimisticTimerState("paused");
		setActiveOperation("pause");
		try {
			await onPauseTimer(sessionMs);
		} catch {
			setOptimisticTimerState(null);
		} finally {
			setActiveOperation(null);
		}
	}, [sessionMs, onPauseTimer]);

	const handleResume = useCallback(async () => {
		setOptimisticTimerState("running");
		setActiveOperation("resume");
		try {
			await onResumeTimer();
		} catch {
			setOptimisticTimerState(null);
		} finally {
			setActiveOperation(null);
		}
	}, [onResumeTimer]);

	const handleStop = useCallback(async () => {
		if (!effectiveWorkingTask) return;
		setOptimisticTimerState("stopped");
		setActiveOperation("stop");
		try {
			await onStopTimer(effectiveWorkingTask, sessionMs);
		} catch {
			setOptimisticTimerState(null);
		} finally {
			setActiveOperation(null);
		}
	}, [effectiveWorkingTask, sessionMs, onStopTimer]);

	// ── Destructive Action Handlers ─────────────────────────────────────────────
	// These clear the UI instantly (optimistic) and sync in background

	const clearNotesAndReset = () => {
		setNote("");
		setNoteEntries([]);
		setNoteType("log");
		setSidequestInput("");
		setSidequestMatches([]);
	};

	const handleComplete = useCallback(async () => {
		if (!effectiveWorkingTask) return;

		let combinedNote = "";
		if (noteEntries.length > 0) {
			const achievements = noteEntries
				.filter((e) => e.type === "achievement")
				.map((e) => e.text);
			const logs = noteEntries
				.filter((e) => e.type === "log")
				.map((e) => `• At ${formatTimeCompact(e.elapsedMs)}  ${e.text}`);
			combinedNote = [...achievements, ...logs].join("\n");
		} else {
			combinedNote = note;
		}

		// INSTANT: Clear UI immediately
		setOptimisticWorkingTask(null);
		clearNotesAndReset();
		setActiveOperation("complete");

		try {
			await onCompleteTask(effectiveWorkingTask, sessionMs, combinedNote);
		} catch {
			// Restore on error so user can retry
			setOptimisticWorkingTask(effectiveWorkingTask);
		} finally {
			setActiveOperation(null);
		}
	}, [effectiveWorkingTask, sessionMs, note, noteEntries, onCompleteTask]);

	const handleReenter = useCallback(async () => {
		if (!effectiveWorkingTask) return;

		const combinedNote =
			noteEntries.length > 0
				? [
						...noteEntries
							.filter((e) => e.type === "achievement")
							.map((e) => e.text),
						...noteEntries
							.filter((e) => e.type === "log")
							.map((e) => `• At ${formatTimeCompact(e.elapsedMs)}  ${e.text}`),
					].join("\n")
				: note;

		// INSTANT: Clear UI immediately
		setOptimisticWorkingTask(null);
		clearNotesAndReset();
		setActiveOperation("reenter");

		try {
			await onReenterTask(effectiveWorkingTask, combinedNote);
		} catch {
			// Restore on error so user can retry
			setOptimisticWorkingTask(effectiveWorkingTask);
		} finally {
			setActiveOperation(null);
		}
	}, [effectiveWorkingTask, noteEntries, note, onReenterTask]);

	const handleCancelTask = useCallback(async () => {
		if (!effectiveWorkingTask) return;

		// INSTANT: Clear UI immediately
		setOptimisticWorkingTask(null);
		clearNotesAndReset();
		setActiveOperation("cancel");

		try {
			await onCancelTask(effectiveWorkingTask, sessionMs);
		} catch {
			// Restore on error so user can retry
			setOptimisticWorkingTask(effectiveWorkingTask);
		} finally {
			setActiveOperation(null);
		}
	}, [effectiveWorkingTask, sessionMs, onCancelTask]);

	// ── Sidequest & Note Handlers ───────────────────────────────────────────────

	const handleSidequestChange = useCallback(
		(value: string) => {
			setSidequestInput(value);
			if (value.trim()) {
				setSidequestMatches(
					activeTasks
						.filter(
							(t) =>
								t.text.toLowerCase().includes(value.toLowerCase()) &&
								t.id !== effectiveWorkingTask?.id,
						)
						.slice(0, 5),
				);
			} else {
				setSidequestMatches([]);
			}
		},
		[activeTasks, effectiveWorkingTask],
	);

	const handleSidequestSubmit = useCallback(
		async (taskId: string | null, text: string) => {
			const trimmed = text.trim();
			if (!trimmed || sidequestSubmitting) return;
			setSidequestSubmitting(true);
			try {
				await onCompleteAdjacentTask(taskId, trimmed);
				setNoteEntries((prev) => [
					...prev,
					{
						id: crypto.randomUUID(),
						elapsedMs: (effectiveWorkingTask?.total_time_ms ?? 0) + sessionMs,
						text: trimmed,
						type: "sidequest",
					},
				]);
				setSidequestInput("");
				setSidequestMatches([]);
			} finally {
				setSidequestSubmitting(false);
			}
		},
		[
			sidequestSubmitting,
			onCompleteAdjacentTask,
			effectiveWorkingTask,
			sessionMs,
		],
	);

	const handleNoteSubmit = useCallback(() => {
		const trimmed = noteInput.trim();
		if (!trimmed) return;
		const elapsed = (effectiveWorkingTask?.total_time_ms ?? 0) + sessionMs;
		setNoteEntries((prev) => [
			...prev,
			{
				id: crypto.randomUUID(),
				elapsedMs: elapsed,
				text: trimmed,
				type: noteType,
			},
		]);
		setNoteInput("");
	}, [noteInput, effectiveWorkingTask, sessionMs, noteType]);

	// ── Render: Idle State ──────────────────────────────────────────────────────
	if (!effectiveWorkingTask) {
		return (
			<IdleInput
				activeTasks={activeTasks}
				onAddTaskAndStart={onAddTaskAndStart}
				onStartTask={onStartTask}
			/>
		);
	}

	// ── Render: Working State ───────────────────────────────────────────────────
	const totalDisplayTime = effectiveWorkingTask.total_time_ms + sessionMs;
	const workingPamphlet =
		pamphlets.find((p) => p.id === effectiveWorkingTask.pamphlet_id) ?? null;

	// Determine which button is active to show only that one during operation
	const showOnlyActiveButton = activeOperation !== null;
	const isCompleting = activeOperation === "complete";
	const isReentering = activeOperation === "reenter";
	const isCancelling = activeOperation === "cancel";

	return (
		<div className="border-y border-border/80 bg-card px-4 py-3 md:px-10 md:py-4">
			<div className="mx-auto flex max-w-6xl flex-col gap-3 md:grid md:grid-cols-2 md:gap-6">
				{/* LEFT COLUMN: Task info + Timer + Actions */}
				<div className="flex flex-col gap-3">
					{/* Task Title + Cancel */}
					<div className="flex items-start justify-between gap-3">
						<p className="truncate text-base font-semibold tracking-tight text-foreground md:text-3xl md:tracking-[0.04em]">
							{effectiveWorkingTask.text}
						</p>
						{!showOnlyActiveButton && (
							<button
								onClick={handleCancelTask}
								disabled={isCancelling}
								className={iconBtn}
								title="Remove from working panel"
							>
								{isCancelling ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<X className="h-4 w-4" />
								)}
							</button>
						)}
					</div>

					{/* Metadata Row */}
					<div className="flex items-center gap-2 flex-wrap">
						{workingPamphlet && (
							<span
								className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-[0.15em] ${PAMPHLET_COLORS[workingPamphlet.color].bg} ${PAMPHLET_COLORS[workingPamphlet.color].text} ${PAMPHLET_COLORS[workingPamphlet.color].border} border`}
							>
								{workingPamphlet.name}
							</span>
						)}

						<div className="relative">
							<button
								onClick={() => setDueDatePickerOpen((prev) => !prev)}
								disabled={showOnlyActiveButton}
								className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border transition-colors ${
									effectiveWorkingTask.due_date
										? (() => {
												const { urgency } = formatDueDate(
													effectiveWorkingTask.due_date,
												);
												const urgencyClasses: Record<string, string> = {
													overdue:
														"border-red-500/40 bg-red-500/10 text-red-500",
													soon: "border-amber-500/40 bg-amber-500/10 text-amber-500",
													normal:
														"border-muted-foreground/30 bg-muted/50 text-muted-foreground",
													far: "border-muted-foreground/20 bg-transparent text-muted-foreground/50",
												};
												return urgencyClasses[urgency];
											})()
										: "border-dashed border-muted-foreground/30 text-muted-foreground/50 hover:border-muted-foreground/60 hover:text-muted-foreground"
								}`}
							>
								{effectiveWorkingTask.due_date
									? `⏰ ${formatDueDate(effectiveWorkingTask.due_date).label}`
									: "+ due date"}
							</button>
							{dueDatePickerOpen && (
								<DueDatePicker
									currentDueDate={effectiveWorkingTask.due_date}
									onSet={(isoDate) =>
										onUpdateDueDate(effectiveWorkingTask.id, isoDate)
									}
									onClose={() => setDueDatePickerOpen(false)}
								/>
							)}
						</div>

						<TagPill
							tagId={effectiveWorkingTask.tag}
							onSelectTag={(tag) =>
								onUpdateTaskTag(effectiveWorkingTask.id, tag)
							}
							className="scale-90 origin-left"
						/>
					</div>

					{/* Timer + Actions */}
					<div className="flex items-center justify-between gap-3 md:flex-col md:items-start md:gap-3">
						<span
							className={`font-mono text-xl tracking-[0.12em] md:text-4xl md:tracking-[0.16em] ${isRunning ? "text-af4-highlight" : "text-foreground"}`}
						>
							{formatTimerDisplay(totalDisplayTime)}
						</span>

						{/* Action Buttons - Only show active one during operation */}
						<div className="flex items-center gap-1.5">
							{isIdle && (
								<>
									{showOnlyActiveButton ? (
										isCompleting ? (
											<ActionButton
												loading
												variant="secondary"
												icon={<Check className="h-4 w-4" />}
											/>
										) : null
									) : (
										<>
											<ActionButton
												onClick={handleStartTimer}
												loading={activeOperation === "start"}
												variant="primary"
												icon={<Play className="h-4 w-4 md:h-3.5 md:w-3.5" />}
												label="Start"
												className="md:hidden"
											/>
											<ActionButton
												onClick={handleComplete}
												loading={isCompleting}
												variant="secondary"
												icon={<Check className="h-4 w-4 text-[#8b9a6b]" />}
												label="Complete"
												className="md:hidden"
											/>
											<ActionButton
												onClick={handleStartTimer}
												loading={activeOperation === "start"}
												variant="primary"
												icon={<Play className="h-3.5 w-3.5" />}
												label="Start"
												className="hidden md:inline-flex"
											/>
											<ActionButton
												onClick={handleComplete}
												loading={isCompleting}
												variant="secondary"
												icon={<Check className="h-3.5 w-3.5 text-[#8b9a6b]" />}
												label="Complete"
												className="hidden md:inline-flex"
											/>
										</>
									)}
								</>
							)}

							{isRunning && (
								<>
									{showOnlyActiveButton ? null : (
										<>
											<ActionButton
												onClick={handlePause}
												loading={activeOperation === "pause"}
												variant="secondary"
												icon={<Pause className="h-4 w-4 md:h-3.5 md:w-3.5" />}
												label="Pause"
												className="md:hidden"
											/>
											<ActionButton
												onClick={handleStop}
												loading={activeOperation === "stop"}
												variant="secondary"
												icon={<Square className="h-4 w-4 md:h-3.5 md:w-3.5" />}
												label="Stop"
												className="md:hidden"
											/>
											<ActionButton
												onClick={handleComplete}
												loading={isCompleting}
												variant="primary"
												icon={<Check className="h-4 w-4 md:h-3.5 md:w-3.5" />}
												label="Complete"
												className="md:hidden"
											/>
											<ActionButton
												onClick={handlePause}
												loading={activeOperation === "pause"}
												variant="secondary"
												icon={<Pause className="h-3.5 w-3.5" />}
												label="Pause"
												className="hidden md:inline-flex"
											/>
											<ActionButton
												onClick={handleStop}
												loading={activeOperation === "stop"}
												variant="secondary"
												icon={<Square className="h-3.5 w-3.5" />}
												label="Stop"
												className="hidden md:inline-flex"
											/>
											<ActionButton
												onClick={handleComplete}
												loading={isCompleting}
												variant="primary"
												icon={<Check className="h-3.5 w-3.5" />}
												label="Complete"
												className="hidden md:inline-flex"
											/>
										</>
									)}
								</>
							)}

							{isPaused && (
								<>
									{showOnlyActiveButton ? null : (
										<>
											<ActionButton
												onClick={handleResume}
												loading={activeOperation === "resume"}
												variant="primary"
												icon={<Play className="h-4 w-4 md:h-3.5 md:w-3.5" />}
												label="Resume"
												className="md:hidden"
											/>
											<ActionButton
												onClick={handleStop}
												loading={activeOperation === "stop"}
												variant="secondary"
												icon={<Square className="h-4 w-4 md:h-3.5 md:w-3.5" />}
												label="Stop"
												className="md:hidden"
											/>
											<ActionButton
												onClick={handleComplete}
												loading={isCompleting}
												variant="secondary"
												icon={
													<Check className="h-4 w-4 text-[#8b9a6b] md:h-3.5 md:w-3.5" />
												}
												label="Complete"
												className="md:hidden"
											/>
											<ActionButton
												onClick={handleResume}
												loading={activeOperation === "resume"}
												variant="primary"
												icon={<Play className="h-3.5 w-3.5" />}
												label="Resume"
												className="hidden md:inline-flex"
											/>
											<ActionButton
												onClick={handleStop}
												loading={activeOperation === "stop"}
												variant="secondary"
												icon={<Square className="h-3.5 w-3.5" />}
												label="Stop"
												className="hidden md:inline-flex"
											/>
											<ActionButton
												onClick={handleComplete}
												loading={isCompleting}
												variant="secondary"
												icon={<Check className="h-3.5 w-3.5 text-[#8b9a6b]" />}
												label="Complete"
												className="hidden md:inline-flex"
											/>
										</>
									)}
								</>
							)}

							{isStopped && (
								<>
									{showOnlyActiveButton ? (
										isReentering ? (
											<ActionButton
												loading
												variant="secondary"
												icon={
													<RefreshCw className="h-4 w-4 md:h-3.5 md:w-3.5" />
												}
												label="Re-entering..."
											/>
										) : isCompleting ? (
											<ActionButton
												loading
												variant="primary"
												icon={<Check className="h-4 w-4 md:h-3.5 md:w-3.5" />}
												label="Completing..."
											/>
										) : null
									) : (
										<>
											<ActionButton
												onClick={handleStartTimer}
												loading={activeOperation === "start"}
												variant="secondary"
												icon={<Play className="h-4 w-4 md:h-3.5 md:w-3.5" />}
												label="Resume"
												className="md:hidden"
											/>
											<ActionButton
												onClick={handleComplete}
												loading={isCompleting}
												variant="primary"
												icon={<Check className="h-4 w-4 md:h-3.5 md:w-3.5" />}
												label="Complete"
												className="md:hidden"
											/>
											<ActionButton
												onClick={handleReenter}
												loading={isReentering}
												variant="secondary"
												icon={
													<RefreshCw
														className={`h-4 w-4 md:h-3.5 md:w-3.5 ${isReentering ? "animate-spin" : ""}`}
													/>
												}
												label="Re-enter"
												className="md:hidden"
											/>
											<ActionButton
												onClick={handleStartTimer}
												loading={activeOperation === "start"}
												variant="secondary"
												icon={<Play className="h-3.5 w-3.5" />}
												label="Resume"
												className="hidden md:inline-flex"
											/>
											<ActionButton
												onClick={handleComplete}
												loading={isCompleting}
												variant="primary"
												icon={<Check className="h-3.5 w-3.5" />}
												label="Complete"
												className="hidden md:inline-flex"
											/>
											<ActionButton
												onClick={handleReenter}
												loading={isReentering}
												variant="secondary"
												icon={
													<RefreshCw
														className={`h-3.5 w-3.5 ${isReentering ? "animate-spin" : ""}`}
													/>
												}
												label="Re-enter"
												className="hidden md:inline-flex"
											/>
										</>
									)}
								</>
							)}
						</div>
					</div>
				</div>

				{/* RIGHT COLUMN: Notes */}
				<div className="flex flex-col gap-3 md:border-l md:border-border/50 md:pl-6">
					{/* Mobile Note Type Toggler */}
					<div className="flex md:hidden items-center gap-1.5 w-full">
						<NoteTypeButton
							type="log"
							current={noteType}
							onClick={setNoteType}
							icon={<ClipboardList className="w-3.5 h-3.5" />}
							label="Log"
							color="[#8b9a6b]"
							disabled={showOnlyActiveButton}
						/>
						<NoteTypeButton
							type="achievement"
							current={noteType}
							onClick={setNoteType}
							icon={<Trophy className="w-3.5 h-3.5" />}
							label="Win"
							color="amber-500"
							disabled={showOnlyActiveButton}
						/>
						<NoteTypeButton
							type="sidequest"
							current={noteType}
							onClick={setNoteType}
							icon={<CheckCheck className="w-3.5 h-3.5" />}
							label="Side Quest"
							color="sky-500"
							disabled={showOnlyActiveButton}
						/>
					</div>

					{/* Desktop Note Type Toggler + Input */}
					<div className="flex items-center gap-2">
						<div className="hidden md:flex items-center gap-0.5 rounded-md border border-border p-1 flex-shrink-0">
							<NoteTypeIconButton
								type="log"
								current={noteType}
								onClick={setNoteType}
								icon={<ClipboardList className="w-3.5 h-3.5" />}
								title="Session log — timestamped entry"
								color="[#8b9a6b]"
								disabled={showOnlyActiveButton}
							/>
							<NoteTypeIconButton
								type="achievement"
								current={noteType}
								onClick={setNoteType}
								icon={<Trophy className="w-3.5 h-3.5" />}
								title="Achievement — completion reflection"
								color="amber-500"
								disabled={showOnlyActiveButton}
							/>
							<NoteTypeIconButton
								type="sidequest"
								current={noteType}
								onClick={setNoteType}
								icon={<CheckCheck className="w-3.5 h-3.5" />}
								title="Side completion — knocked off another task"
								color="sky-500"
								disabled={showOnlyActiveButton}
							/>
						</div>

						{noteType === "sidequest" ? (
							<SidequestInput
								value={sidequestInput}
								onChange={handleSidequestChange}
								onSubmit={handleSidequestSubmit}
								matches={sidequestMatches}
								submitting={sidequestSubmitting}
								disabled={showOnlyActiveButton}
							/>
						) : (
							<NoteInput
								value={noteInput}
								onChange={setNoteInput}
								onSubmit={handleNoteSubmit}
								placeholder={
									noteType === "log"
										? "Log a note, hit Enter..."
										: "What did you achieve?"
								}
								disabled={showOnlyActiveButton}
							/>
						)}
					</div>

					<MobileNotesList
						entries={noteEntries}
						editingId={editingNoteId}
						editingText={editingNoteText}
						onStartEdit={(id, text) => {
							setEditingNoteId(id);
							setEditingNoteText(text);
						}}
						onSaveEdit={(id, text) => {
							if (text.trim()) {
								setNoteEntries((prev) =>
									prev.map((n) => (n.id === id ? { ...n, text } : n)),
								);
							} else {
								setNoteEntries((prev) => prev.filter((n) => n.id !== id));
							}
							setEditingNoteId(null);
							setEditingNoteText("");
						}}
						onCancelEdit={() => {
							setEditingNoteId(null);
							setEditingNoteText("");
						}}
						open={mobileNotesOpen}
						onOpenChange={setMobileNotesOpen}
					/>

					<DesktopNotesList
						entries={noteEntries}
						editingId={editingNoteId}
						editingText={editingNoteText}
						onStartEdit={(id, text) => {
							setEditingNoteId(id);
							setEditingNoteText(text);
						}}
						onSaveEdit={(id, text) => {
							if (text.trim()) {
								setNoteEntries((prev) =>
									prev.map((n) => (n.id === id ? { ...n, text } : n)),
								);
							} else {
								setNoteEntries((prev) => prev.filter((n) => n.id !== id));
							}
							setEditingNoteId(null);
							setEditingNoteText("");
						}}
						onCancelEdit={() => {
							setEditingNoteId(null);
							setEditingNoteText("");
						}}
					/>
				</div>
			</div>
		</div>
	);
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function NoteTypeButton({
	type,
	current,
	onClick,
	icon,
	label,
	color,
	disabled,
}: {
	type: "log" | "achievement" | "sidequest";
	current: string;
	onClick: (t: typeof type) => void;
	icon: React.ReactNode;
	label: string;
	color: string;
	disabled: boolean;
}) {
	const isActive = current === type;
	return (
		<button
			type="button"
			onClick={() => onClick(type)}
			disabled={disabled}
			className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
				isActive
					? `border-${color}/40 bg-${color}/10 text-${color}`
					: "border-border text-muted-foreground/50"
			} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
		>
			{icon}
			{label}
		</button>
	);
}

function NoteTypeIconButton({
	type,
	current,
	onClick,
	icon,
	title,
	color,
	disabled,
}: {
	type: "log" | "achievement" | "sidequest";
	current: string;
	onClick: (t: typeof type) => void;
	icon: React.ReactNode;
	title: string;
	color: string;
	disabled: boolean;
}) {
	const isActive = current === type;
	return (
		<button
			type="button"
			onClick={() => onClick(type)}
			disabled={disabled}
			title={title}
			className={`rounded p-1.5 transition-colors ${
				isActive
					? `bg-${color}/20 text-${color}`
					: "text-muted-foreground/40 hover:text-muted-foreground"
			} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
		>
			{icon}
		</button>
	);
}

function NoteInput({
	value,
	onChange,
	onSubmit,
	placeholder,
	disabled,
}: {
	value: string;
	onChange: (v: string) => void;
	onSubmit: () => void;
	placeholder: string;
	disabled: boolean;
}) {
	return (
		<div className="flex-1 relative flex items-center gap-2">
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") onSubmit();
				}}
				placeholder={placeholder}
				disabled={disabled}
				className="flex-1 bg-transparent border-none outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40 focus:text-foreground transition-colors disabled:opacity-50"
			/>
			{value && !disabled && (
				<button
					type="button"
					onClick={onSubmit}
					className="text-muted-foreground/40 hover:text-[#8b9a6b] transition-colors"
				>
					<Send className="w-3 h-3" />
				</button>
			)}
		</div>
	);
}

function SidequestInput({
	value,
	onChange,
	onSubmit,
	matches,
	submitting,
	disabled,
}: {
	value: string;
	onChange: (v: string) => void;
	onSubmit: (taskId: string | null, text: string) => void;
	matches: Task[];
	submitting: boolean;
	disabled: boolean;
}) {
	return (
		<div className="flex-1 relative flex items-center gap-2">
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter" && !submitting && !disabled) {
						if (matches.length === 1) {
							onSubmit(matches[0].id, matches[0].text);
						} else {
							onSubmit(null, value);
						}
					}
					if (e.key === "Escape") onChange("");
				}}
				placeholder="What did you knock off?"
				disabled={submitting || disabled}
				className="flex-1 bg-transparent border-none outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40 focus:text-foreground transition-colors disabled:opacity-50"
			/>
			{value && !submitting && !disabled && (
				<button
					type="button"
					onMouseDown={(e) => {
						e.preventDefault();
						onSubmit(null, value);
					}}
					className="text-muted-foreground/40 hover:text-sky-500 transition-colors"
				>
					<Send className="w-3 h-3" />
				</button>
			)}

			{matches.length > 0 && (
				<div className="absolute bottom-full mb-2 left-0 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 w-72">
					{matches.map((task) => (
						<button
							key={task.id}
							type="button"
							onMouseDown={(e) => {
								e.preventDefault();
								onSubmit(task.id, task.text);
							}}
							className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
						>
							<CheckCheck className="w-3 h-3 text-sky-500 flex-shrink-0" />
							<span className="truncate text-foreground">{task.text}</span>
						</button>
					))}
					{value.trim() && (
						<button
							type="button"
							onMouseDown={(e) => {
								e.preventDefault();
								onSubmit(null, value);
							}}
							className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-accent transition-colors text-left border-t border-border text-muted-foreground"
						>
							<CheckCheck className="w-3 h-3 flex-shrink-0" />
							<span>Complete "{value.trim()}" as new</span>
						</button>
					)}
				</div>
			)}
		</div>
	);
}

function MobileNotesList({
	entries,
	editingId,
	editingText,
	onStartEdit,
	onSaveEdit,
	onCancelEdit,
	open,
	onOpenChange,
}: {
	entries: NoteEntry[];
	editingId: string | null;
	editingText: string;
	onStartEdit: (id: string, text: string) => void;
	onSaveEdit: (id: string, text: string) => void;
	onCancelEdit: () => void;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const sortedEntries = [
		...entries.filter((e) => e.type === "achievement"),
		...entries.filter((e) => e.type === "sidequest"),
		...entries.filter((e) => e.type === "log"),
	];

	return (
		<Collapsible
			open={open}
			onOpenChange={onOpenChange}
			className="md:hidden -mb-2.5"
		>
			<CollapsibleContent
				className={`${entries.length > 2 ? "border border-border" : ""} pt-0 pb-1 px-2 rounded-[0.25rem]`}
			>
				<NotesListContent
					entries={sortedEntries}
					editingId={editingId}
					editingText={editingText}
					onStartEdit={onStartEdit}
					onSaveEdit={onSaveEdit}
					onCancelEdit={onCancelEdit}
					maxHeight="88px"
					className="mt-1.5"
				/>
			</CollapsibleContent>

			{entries.length > 0 && (
				<CollapsibleTrigger className="flex items-center justify-center w-full py-1 px-2 rounded-lg hover:bg-accent transition-colors">
					<ChevronDown
						className={`w-5 h-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
					/>
				</CollapsibleTrigger>
			)}
		</Collapsible>
	);
}

function DesktopNotesList({
	entries,
	editingId,
	editingText,
	onStartEdit,
	onSaveEdit,
	onCancelEdit,
}: {
	entries: NoteEntry[];
	editingId: string | null;
	editingText: string;
	onStartEdit: (id: string, text: string) => void;
	onSaveEdit: (id: string, text: string) => void;
	onCancelEdit: () => void;
}) {
	const sortedEntries = [
		...entries.filter((e) => e.type === "achievement"),
		...entries.filter((e) => e.type === "sidequest"),
		...entries.filter((e) => e.type === "log"),
	];

	return (
		<div className="flex flex-col gap-1.5 border border-border rounded-[0.25rem] py-1 px-2 h-full max-sm:hidden min-h-[40px]">
			<NotesListContent
				entries={sortedEntries}
				editingId={editingId}
				editingText={editingText}
				onStartEdit={onStartEdit}
				onSaveEdit={onSaveEdit}
				onCancelEdit={onCancelEdit}
				maxHeight="110px"
			/>
		</div>
	);
}

function NotesListContent({
	entries,
	editingId,
	editingText,
	onStartEdit,
	onSaveEdit,
	onCancelEdit,
	maxHeight,
	className = "",
}: {
	entries: NoteEntry[];
	editingId: string | null;
	editingText: string;
	onStartEdit: (id: string, text: string) => void;
	onSaveEdit: (id: string, text: string) => void;
	onCancelEdit: () => void;
	maxHeight: string;
	className?: string;
}) {
	if (entries.length === 0) {
		return (
			<div className="text-xs text-muted-foreground/30 italic px-1">
				No notes yet...
			</div>
		);
	}

	return (
		<div
			className={`flex flex-col gap-0.5 overflow-y-auto ${className}`}
			style={{
				maxHeight,
				scrollbarWidth: "thin",
				scrollbarColor: "hsl(var(--border)) transparent",
			}}
		>
			{entries.map((entry) => {
				const isAchievement = entry.type === "achievement";
				const isSidequest = entry.type === "sidequest";
				const isEditing = editingId === entry.id;

				return (
					<div
						key={entry.id}
						className="flex items-baseline gap-2 text-xs group"
					>
						{isAchievement ? (
							<span className="text-amber-500 flex-shrink-0 text-[11px]">
								🏆
							</span>
						) : isSidequest ? (
							<CheckCheck className="w-3 h-3 text-sky-500 flex-shrink-0" />
						) : (
							<span className="text-[#8b9a6b] font-mono flex-shrink-0">•</span>
						)}

						{!isAchievement && !isSidequest && (
							<span className="font-mono text-[10px] flex-shrink-0 text-muted-foreground/50">
								{formatTimeCompact(entry.elapsedMs)}
							</span>
						)}

						{isEditing ? (
							<input
								autoFocus
								value={editingText}
								onChange={(e) => onStartEdit(entry.id, e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") onSaveEdit(entry.id, editingText);
									if (e.key === "Escape") onCancelEdit();
								}}
								onBlur={() => onSaveEdit(entry.id, editingText)}
								className={`flex-1 bg-transparent border-none outline-none text-xs focus:text-foreground transition-colors ${
									isAchievement
										? "text-amber-400"
										: isSidequest
											? "text-sky-400"
											: "text-foreground"
								}`}
							/>
						) : (
							<span
								onClick={() => onStartEdit(entry.id, entry.text)}
								className={`cursor-pointer hover:text-foreground transition-colors flex-1 ${
									isAchievement
										? "text-amber-500 dark:text-amber-400"
										: isSidequest
											? "text-sky-500 dark:text-sky-400"
											: "text-foreground/70"
								}`}
							>
								{entry.text}
							</span>
						)}
					</div>
				);
			})}
		</div>
	);
}
