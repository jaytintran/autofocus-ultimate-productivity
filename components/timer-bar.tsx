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
} from "lucide-react";
import type { Task, AppState, Pamphlet } from "@/lib/types";
import { TAG_DEFINITIONS, getTagDefinition, type TagId } from "@/lib/tags";
import { formatTimeCompact } from "@/lib/utils/time-utils";
import {
	formatDueDate,
	parseDueDateShortcut,
} from "@/lib/utils/due-date-parser";
import { PAMPHLET_COLORS } from "@/lib/pamphlet-colors";
import { TagPill } from "./tag-pill";

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

// Defined outside component — stable reference, no recreation on render
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
// BUTTON STYLES
// =============================================================================

const primaryBtn =
	"items-center justify-center gap-2 rounded-sm border border-[#a3b56a]/40 bg-[#a3b56a] px-4 py-2 text-sm font-medium text-[#1f2414] transition-colors hover:bg-[#b2c777] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryBtn =
	"items-center justify-center gap-2 rounded-sm border border-border bg-transparent px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";
const iconBtn =
	"inline-flex items-center justify-center rounded-sm border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50";

// =============================================================================
// IDLE INPUT (no working task)
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

		// Clear input immediately — no waiting
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
					{/* Tag mention dropdown */}
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

					{/* Existing task matches */}
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
// DUE DATE POP UP PICKER
// =============================================================================
// Popup picker for setting/changing due date on the working task
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

	// Presets — reuse parseDueDateShortcut with shortcut strings
	const PRESETS = [
		{ label: "15m", shortcut: "!15m" },
		{ label: "30m", shortcut: "!30m" },
		{ label: "45m", shortcut: "!45m" },
		{ label: "1h", shortcut: "!1h" },
		{ label: "3h", shortcut: "!3h" },
		{ label: "1d", shortcut: "!1d" },
	];

	// Close on outside click
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
		// Prepend ! if user forgot it
		const normalized = input.startsWith("!") ? input : `!${input}`;
		const { dueDate } = parseDueDateShortcut(normalized);
		if (dueDate) {
			setCustomError(false);
			onSet(dueDate.toISOString());
			onClose();
		} else {
			// Flash error state briefly
			setCustomError(true);
			setTimeout(() => setCustomError(false), 1200);
		}
	};

	return (
		<div
			ref={menuRef}
			className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl p-3 w-56 flex flex-col gap-2"
		>
			{/* Preset buttons */}
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

			{/* Custom shortcut input — same syntax as task input */}
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
					className={`flex-1 bg-background border rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring transition-colors
            ${customError ? "border-destructive" : "border-input"}`}
				/>
				<button
					onClick={handleCustomSubmit}
					className="px-2 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
				>
					Set
				</button>
			</div>

			{/* Show current due date with a clear option if one is set */}
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
// MAIN COMPONENT
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
	// ── Optimistic timer state ─────────────────────────────────────────────────
	// Instead of isLoading blocking everything, we track optimistic timer state
	// locally so the UI updates instantly on button press.
	type OptimisticTimer = "idle" | "running" | "paused" | "stopped" | null;
	const [optimisticTimerState, setOptimisticTimerState] =
		useState<OptimisticTimer>(null);

	const [dueDatePickerOpen, setDueDatePickerOpen] = useState(false);
	const [note, setNote] = useState("");

	// Clear optimistic state when real appState catches up
	useEffect(() => {
		setOptimisticTimerState(null);
	}, [appState.timer_state]);

	const timerState = optimisticTimerState ?? appState.timer_state;
	const isIdle = timerState === "idle";
	const isRunning = timerState === "running";
	const isPaused = timerState === "paused";
	const isStopped = timerState === "stopped";

	// ── Session timer ──────────────────────────────────────────────────────────
	const [sessionMs, setSessionMs] = useState(0);
	const sessionStartRef = useRef<number | null>(null);
	const baseSessionMsRef = useRef(0);

	// ── Note entries ───────────────────────────────────────────────────────────
	const [noteEntries, setNoteEntries] = useState<NoteEntry[]>([]);
	const [noteInput, setNoteInput] = useState("");
	const [noteType, setNoteType] = useState<"log" | "achievement" | "sidequest">(
		"log",
	);

	// ── Sidequest entries ───────────────────────────────────────────────────────
	const [sidequestInput, setSidequestInput] = useState("");
	const [sidequestMatches, setSidequestMatches] = useState<Task[]>([]);
	const [sidequestSubmitting, setSidequestSubmitting] = useState(false);

	const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
	const [editingNoteText, setEditingNoteText] = useState("");

	useEffect(() => {
		if (!workingTask) {
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
		workingTask,
		appState.timer_state,
		appState.session_start_time,
		appState.current_session_ms,
	]);

	// ── Handlers — optimistic first, then async ───────────────────────────────

	const handleStartTimer = useCallback(async () => {
		setOptimisticTimerState("running");
		try {
			await onStartTimer();
		} catch {
			setOptimisticTimerState(null);
		}
	}, [onStartTimer]);

	const handlePause = useCallback(async () => {
		setOptimisticTimerState("paused");
		try {
			await onPauseTimer(sessionMs);
		} catch {
			setOptimisticTimerState(null);
		}
	}, [sessionMs, onPauseTimer]);

	const handleResume = useCallback(async () => {
		setOptimisticTimerState("running");
		try {
			await onResumeTimer();
		} catch {
			setOptimisticTimerState(null);
		}
	}, [onResumeTimer]);

	const handleStop = useCallback(async () => {
		if (!workingTask) return;
		setOptimisticTimerState("stopped");
		try {
			await onStopTimer(workingTask, sessionMs);
		} catch {
			setOptimisticTimerState(null);
		}
	}, [workingTask, sessionMs, onStopTimer]);

	const handleComplete = useCallback(async () => {
		if (!workingTask) return;

		let combinedNote = "";
		if (noteEntries.length > 0) {
			const achievements = noteEntries
				.filter((e) => e.type === "achievement")
				.map((e) => e.text);
			const logs = noteEntries
				.filter((e) => e.type === "log")
				.map((e) => `• At ${formatTimeCompact(e.elapsedMs)}  ${e.text}`);
			// sidequest entries excluded — they're already completed tasks
			combinedNote = [...achievements, ...logs].join("\n");
		} else {
			combinedNote = note;
		}

		setNote("");
		setNoteEntries([]);
		setNoteType("log");
		await onCompleteTask(workingTask, sessionMs, combinedNote);
	}, [workingTask, sessionMs, note, noteEntries, onCompleteTask]);

	const handleReenter = useCallback(async () => {
		if (!workingTask) return;
		const combinedNote =
			noteEntries.length > 0
				? [
						...noteEntries
							.filter((e) => e.type === "achievement")
							.map((e) => e.text),
						...noteEntries
							.filter((e) => e.type === "log")
							.map((e) => `• At ${formatTimeCompact(e.elapsedMs)}  ${e.text}`),
						// sidequest entries excluded — they're already completed tasks
					].join("\n")
				: note;
		setNote("");
		setNoteEntries([]);
		setNoteType("log");
		setSidequestInput("");
		setSidequestMatches([]);
		await onReenterTask(workingTask, combinedNote);
	}, [workingTask, noteEntries, note, onReenterTask]);

	const handleCancelTask = useCallback(async () => {
		if (!workingTask) return;
		await onCancelTask(workingTask, sessionMs);
	}, [workingTask, sessionMs, onCancelTask]);

	const handleSidequestChange = useCallback(
		(value: string) => {
			setSidequestInput(value);
			if (value.trim()) {
				setSidequestMatches(
					activeTasks
						.filter(
							(t) =>
								t.text.toLowerCase().includes(value.toLowerCase()) &&
								t.id !== workingTask?.id,
						)
						.slice(0, 5),
				);
			} else {
				setSidequestMatches([]);
			}
		},
		[activeTasks, workingTask],
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
						elapsedMs: (workingTask?.total_time_ms ?? 0) + sessionMs,
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
		[sidequestSubmitting, onCompleteAdjacentTask, workingTask, sessionMs],
	);

	const handleNoteSubmit = useCallback(() => {
		const trimmed = noteInput.trim();
		if (!trimmed) return;
		const elapsed = (workingTask?.total_time_ms ?? 0) + sessionMs;
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
	}, [noteInput, workingTask, sessionMs, noteType]);

	// ── Idle state — delegate to extracted component ───────────────────────────
	if (!workingTask) {
		return (
			<IdleInput
				activeTasks={activeTasks}
				onAddTaskAndStart={onAddTaskAndStart}
				onStartTask={onStartTask}
			/>
		);
	}

	// ── Working state ──────────────────────────────────────────────────────────
	const totalDisplayTime = workingTask.total_time_ms + sessionMs;
	const statusText = isRunning
		? "Timer running"
		: isPaused
			? "Timer paused"
			: isStopped
				? "Session saved"
				: "Ready to start";

	const workingPamphlet =
		pamphlets.find((p) => p.id === workingTask.pamphlet_id) ?? null;

	return (
		<div className="border-y border-border/80 bg-card px-4 py-3 md:px-10 md:py-4">
			<div className="mx-auto flex max-w-6xl flex-col gap-3">
				{/* Top row */}
				<div className="flex flex-col gap-1.5">
					{/* Title + X */}
					<div className="flex items-start justify-between gap-3">
						<p className="truncate text-base font-semibold tracking-tight text-foreground md:text-3xl md:tracking-[0.04em]">
							{workingTask.text}
						</p>
						<button
							onClick={handleCancelTask}
							className={iconBtn}
							title="Remove from working panel"
						>
							<X className="h-4 w-4" />
						</button>
					</div>

					{/* Badges row: pamphlet + due date + tag */}
					<div className="flex items-center gap-2 flex-wrap">
						{workingPamphlet && (
							<span
								className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-[0.15em] ${PAMPHLET_COLORS[workingPamphlet.color].bg} ${PAMPHLET_COLORS[workingPamphlet.color].text} ${PAMPHLET_COLORS[workingPamphlet.color].border} border`}
							>
								{workingPamphlet.name}
							</span>
						)}

						{/* Due date chip */}
						<div className="relative">
							<button
								onClick={() => setDueDatePickerOpen((prev) => !prev)}
								className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border transition-colors
                    ${
											workingTask.due_date
												? (() => {
														const { urgency } = formatDueDate(
															workingTask.due_date,
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
								{workingTask.due_date
									? `⏰ ${formatDueDate(workingTask.due_date).label}`
									: "+ due date"}
							</button>
							{dueDatePickerOpen && (
								<DueDatePicker
									currentDueDate={workingTask.due_date}
									onSet={(isoDate) => onUpdateDueDate(workingTask.id, isoDate)}
									onClose={() => setDueDatePickerOpen(false)}
								/>
							)}
						</div>

						{/* Tag pill */}
						<TagPill
							tagId={workingTask.tag}
							onSelectTag={(tag) => onUpdateTaskTag(workingTask.id, tag)}
							className="scale-90 origin-left"
						/>
					</div>
				</div>

				{/* Timer + action buttons — inline on mobile, stacked on desktop */}
				<div className="flex items-center justify-between gap-3 md:flex-col md:items-start md:gap-3">
					{/* Timer */}
					<span
						className={`font-mono text-xl tracking-[0.12em] md:text-4xl md:tracking-[0.16em] ${isRunning ? "text-af4-highlight" : "text-foreground"}`}
					>
						{formatTimerDisplay(totalDisplayTime)}
					</span>

					{/* Action buttons */}
					<div className="flex items-center gap-1.5">
						{isIdle && (
							<>
								{/* Mobile: icon only */}
								<button
									onClick={handleStartTimer}
									className={`${primaryBtn} md:hidden`}
									title="Start"
								>
									<Play className="h-4 w-4" />
								</button>
								<button
									onClick={handleComplete}
									className={`${secondaryBtn} md:hidden`}
									title="Complete"
								>
									<Check className="h-4 w-4 text-[#8b9a6b]" />
								</button>
								{/* Desktop: icon + text */}
								<button
									onClick={handleStartTimer}
									className={`${primaryBtn} hidden md:inline-flex`}
								>
									<Play className="h-3.5 w-3.5" />
									Start
								</button>
								<button
									onClick={handleComplete}
									className={`${secondaryBtn} hidden md:inline-flex`}
								>
									<Check className="h-3.5 w-3.5 text-[#8b9a6b]" />
									Complete
								</button>
							</>
						)}
						{isRunning && (
							<>
								<button
									onClick={handlePause}
									className={`${secondaryBtn} md:hidden`}
									title="Pause"
								>
									<Pause className="h-4 w-4" />
								</button>
								<button
									onClick={handleStop}
									className={`${secondaryBtn} md:hidden`}
									title="Stop"
								>
									<Square className="h-4 w-4" />
								</button>
								<button
									onClick={handleComplete}
									className={`${primaryBtn} md:hidden`}
									title="Complete"
								>
									<Check className="h-4 w-4" />
								</button>
								<button
									onClick={handlePause}
									className={`${secondaryBtn} hidden md:inline-flex`}
								>
									<Pause className="h-3.5 w-3.5" />
									Pause
								</button>
								<button
									onClick={handleStop}
									className={`${secondaryBtn} hidden md:inline-flex`}
								>
									<Square className="h-3.5 w-3.5" />
									Stop
								</button>
								<button
									onClick={handleComplete}
									className={`${primaryBtn} hidden md:inline-flex`}
								>
									<Check className="h-3.5 w-3.5" />
									Complete
								</button>
							</>
						)}
						{isPaused && (
							<>
								<button
									onClick={handleResume}
									className={`${primaryBtn} md:hidden`}
									title="Resume"
								>
									<Play className="h-4 w-4" />
								</button>
								<button
									onClick={handleStop}
									className={`${secondaryBtn} md:hidden`}
									title="Stop"
								>
									<Square className="h-4 w-4" />
								</button>
								<button
									onClick={handleComplete}
									className={`${secondaryBtn} md:hidden`}
									title="Complete"
								>
									<Check className="h-4 w-4 text-[#8b9a6b]" />
								</button>
								<button
									onClick={handleResume}
									className={`${primaryBtn} hidden md:inline-flex`}
								>
									<Play className="h-3.5 w-3.5" />
									Resume
								</button>
								<button
									onClick={handleStop}
									className={`${secondaryBtn} hidden md:inline-flex`}
								>
									<Square className="h-3.5 w-3.5" />
									Stop
								</button>
								<button
									onClick={handleComplete}
									className={`${secondaryBtn} hidden md:inline-flex`}
								>
									<Check className="h-3.5 w-3.5 text-[#8b9a6b]" />
									Complete
								</button>
							</>
						)}
						{isStopped && (
							<>
								<button
									onClick={handleStartTimer}
									className={`${secondaryBtn} md:hidden`}
									title="Resume"
								>
									<Play className="h-4 w-4" />
								</button>
								<button
									onClick={handleComplete}
									className={`${primaryBtn} md:hidden`}
									title="Complete"
								>
									<Check className="h-4 w-4" />
								</button>
								<button
									onClick={handleReenter}
									className={`${secondaryBtn} md:hidden`}
									title="Re-enter"
								>
									<RefreshCw className="h-4 w-4" />
								</button>
								<button
									onClick={handleStartTimer}
									className={`${secondaryBtn} hidden md:inline-flex`}
								>
									<Play className="h-3.5 w-3.5" />
									Resume
								</button>
								<button
									onClick={handleComplete}
									className={`${primaryBtn} hidden md:inline-flex`}
								>
									<Check className="h-3.5 w-3.5" />
									Complete
								</button>
								<button
									onClick={handleReenter}
									className={`${secondaryBtn} hidden md:inline-flex`}
								>
									<RefreshCw className="h-3.5 w-3.5" />
									Re-enter
								</button>
							</>
						)}
					</div>
				</div>

				{/* Divider */}
				<div className="h-px w-full bg-border/50" />

				{/* Note input */}
				{/* Mobile toggler — own row */}
				<div className="flex md:hidden items-center gap-1.5 w-full">
					<button
						type="button"
						onClick={() => setNoteType("log")}
						className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
							noteType === "log"
								? "border-[#8b9a6b]/40 bg-[#8b9a6b]/10 text-[#8b9a6b]"
								: "border-border text-muted-foreground/50"
						}`}
					>
						<ClipboardList className="w-3.5 h-3.5" />
						Log
					</button>
					<button
						type="button"
						onClick={() => setNoteType("achievement")}
						className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
							noteType === "achievement"
								? "border-amber-500/40 bg-amber-500/10 text-amber-500"
								: "border-border text-muted-foreground/50"
						}`}
					>
						<Trophy className="w-3.5 h-3.5" />
						Win
					</button>
					<button
						type="button"
						onClick={() => setNoteType("sidequest")}
						className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
							noteType === "sidequest"
								? "border-sky-500/40 bg-sky-500/10 text-sky-500"
								: "border-border text-muted-foreground/50"
						}`}
					>
						<CheckCheck className="w-3.5 h-3.5" />
						Side Quest
					</button>
				</div>

				{/* Input row — desktop toggler + input + send */}
				<div className="flex items-center gap-2">
					{/* Desktop toggler only */}
					<div className="hidden md:flex items-center gap-0.5 rounded-md border border-border p-1 flex-shrink-0">
						<button
							type="button"
							onClick={() => setNoteType("log")}
							title="Session log — timestamped entry"
							className={`rounded p-1.5 transition-colors ${
								noteType === "log"
									? "bg-[#8b9a6b]/20 text-[#8b9a6b]"
									: "text-muted-foreground/40 hover:text-muted-foreground"
							}`}
						>
							<ClipboardList className="w-3.5 h-3.5" />
						</button>
						<button
							type="button"
							onClick={() => setNoteType("achievement")}
							title="Achievement — completion reflection"
							className={`rounded p-1.5 transition-colors ${
								noteType === "achievement"
									? "bg-amber-500/20 text-amber-500"
									: "text-muted-foreground/40 hover:text-muted-foreground"
							}`}
						>
							<Trophy className="w-3.5 h-3.5" />
						</button>
						<button
							type="button"
							onClick={() => setNoteType("sidequest")}
							title="Side completion — knocked off another task"
							className={`rounded p-1.5 transition-colors ${
								noteType === "sidequest"
									? "bg-sky-500/20 text-sky-500"
									: "text-muted-foreground/40 hover:text-muted-foreground"
							}`}
						>
							<CheckCheck className="w-3.5 h-3.5" />
						</button>
					</div>

					{noteType === "sidequest" ? (
						<div className="flex-1 relative">
							<input
								type="text"
								value={sidequestInput}
								onChange={(e) => handleSidequestChange(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !sidequestSubmitting) {
										if (sidequestMatches.length === 1) {
											handleSidequestSubmit(
												sidequestMatches[0].id,
												sidequestMatches[0].text,
											);
										} else {
											handleSidequestSubmit(null, sidequestInput);
										}
									}
									if (e.key === "Escape") setSidequestMatches([]);
								}}
								placeholder="What did you knock off?"
								disabled={sidequestSubmitting}
								className="w-full bg-transparent border-none outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40 focus:text-foreground transition-colors"
							/>
							{sidequestMatches.length > 0 && (
								<div className="absolute bottom-full mb-2 left-0 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 w-72">
									{sidequestMatches.map((task) => (
										<button
											key={task.id}
											type="button"
											onMouseDown={(e) => {
												e.preventDefault();
												handleSidequestSubmit(task.id, task.text);
											}}
											className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
										>
											<CheckCheck className="w-3 h-3 text-sky-500 flex-shrink-0" />
											<span className="truncate text-foreground">
												{task.text}
											</span>
										</button>
									))}
									{sidequestInput.trim() && (
										<button
											type="button"
											onMouseDown={(e) => {
												e.preventDefault();
												handleSidequestSubmit(null, sidequestInput);
											}}
											className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-accent transition-colors text-left border-t border-border text-muted-foreground"
										>
											<CheckCheck className="w-3 h-3 flex-shrink-0" />
											<span>Complete "{sidequestInput.trim()}" as new</span>
										</button>
									)}
								</div>
							)}
						</div>
					) : (
						<input
							type="text"
							value={noteInput}
							onChange={(e) => setNoteInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleNoteSubmit();
							}}
							placeholder={
								noteType === "log"
									? "Log a note, hit Enter..."
									: "What did you achieve?"
							}
							className="flex-1 bg-transparent border-none outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40 focus:text-foreground transition-colors"
						/>
					)}
					{noteType !== "sidequest" && noteInput && (
						<button
							type="button"
							onClick={handleNoteSubmit}
							className="text-muted-foreground/40 hover:text-[#8b9a6b] transition-colors"
						>
							<Send className="w-3 h-3" />
						</button>
					)}
					{noteType === "sidequest" &&
						sidequestInput &&
						!sidequestSubmitting && (
							<button
								type="button"
								onMouseDown={(e) => {
									e.preventDefault();
									handleSidequestSubmit(null, sidequestInput);
								}}
								className="text-muted-foreground/40 hover:text-sky-500 transition-colors"
							>
								<Send className="w-3 h-3" />
							</button>
						)}
				</div>

				{/* Note log zone */}
				<div className="flex flex-col gap-1.5">
					{/* Scrollable bullet list — achievements pinned top, logs below, max ~4 lines */}
					{noteEntries.length > 0 && (
						<div
							className="flex flex-col gap-0.5 overflow-y-auto max-h-[88px]"
							style={{
								scrollbarWidth: "thin",
								scrollbarColor: "hsl(var(--border)) transparent",
							}}
						>
							{[
								...noteEntries.filter((e) => e.type === "achievement"),
								...noteEntries.filter((e) => e.type === "sidequest"),
								...noteEntries.filter((e) => e.type === "log"),
							].map((entry) => {
								const isAchievement = entry.type === "achievement";
								const isSidequest = entry.type === "sidequest";
								return (
									<div
										key={entry.id}
										className="flex items-baseline gap-2 text-xs"
									>
										{/* Bullet / icon */}
										{isAchievement ? (
											<span className="text-amber-500 flex-shrink-0 text-[11px]">
												🏆
											</span>
										) : isSidequest ? (
											<CheckCheck className="w-3 h-3 text-sky-500 flex-shrink-0" />
										) : (
											<span className="text-[#8b9a6b] font-mono flex-shrink-0">
												•
											</span>
										)}

										{/* Timestamp — only for logs */}
										{!isAchievement && !isSidequest && (
											<span className="font-mono text-[10px] flex-shrink-0 text-muted-foreground/50">
												{formatTimeCompact(entry.elapsedMs)}
											</span>
										)}

										{/* Inline edit */}
										{editingNoteId === entry.id ? (
											<input
												autoFocus
												value={editingNoteText}
												onChange={(e) => setEditingNoteText(e.target.value)}
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														const trimmed = editingNoteText.trim();
														if (trimmed) {
															setNoteEntries((prev) =>
																prev.map((n) =>
																	n.id === entry.id
																		? { ...n, text: trimmed }
																		: n,
																),
															);
														} else {
															setNoteEntries((prev) =>
																prev.filter((n) => n.id !== entry.id),
															);
														}
														setEditingNoteId(null);
														setEditingNoteText("");
													}
													if (e.key === "Escape") {
														setEditingNoteId(null);
														setEditingNoteText("");
													}
												}}
												onBlur={() => {
													const trimmed = editingNoteText.trim();
													if (trimmed) {
														setNoteEntries((prev) =>
															prev.map((n) =>
																n.id === entry.id ? { ...n, text: trimmed } : n,
															),
														);
													} else {
														setNoteEntries((prev) =>
															prev.filter((n) => n.id !== entry.id),
														);
													}
													setEditingNoteId(null);
													setEditingNoteText("");
												}}
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
												onClick={() => {
													setEditingNoteId(entry.id);
													setEditingNoteText(entry.text);
												}}
												className={`cursor-pointer hover:text-foreground transition-colors ${
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
					)}
				</div>
			</div>
		</div>
	);
}
