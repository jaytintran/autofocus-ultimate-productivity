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
} from "lucide-react";
import type { Task, AppState, Pamphlet } from "@/lib/types";
import { TAG_DEFINITIONS, getTagDefinition, type TagId } from "@/lib/tags";
import { formatTimeCompact } from "@/lib/utils/time-utils";
import {
	formatDueDate,
	parseDueDateShortcut,
} from "@/lib/utils/due-date-parser";
import { PAMPHLET_COLORS } from "@/lib/pamphlet-colors";

// =============================================================================
// TYPES
// =============================================================================

interface TimerBarProps {
	appState: AppState;
	workingTask: Task | null;
	onStartTimer: () => Promise<void>;
	onPauseTimer: (sessionMs: number) => Promise<void>;
	onResumeTimer: () => Promise<void>;
	onStopTimer: (task: Task, sessionMs: number) => Promise<void>;
	onCompleteTask: (task: Task, sessionMs: number) => Promise<void>;
	onCancelTask: (task: Task, sessionMs: number) => Promise<void>;
	onReenterTask: (task: Task) => Promise<void>;
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
	"inline-flex items-center justify-center gap-2 rounded-sm border border-[#a3b56a]/40 bg-[#a3b56a] px-4 py-2 text-sm font-medium text-[#1f2414] transition-colors hover:bg-[#b2c777] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryBtn =
	"inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-transparent px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";
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
}: TimerBarProps) {
	// ── Optimistic timer state ─────────────────────────────────────────────────
	// Instead of isLoading blocking everything, we track optimistic timer state
	// locally so the UI updates instantly on button press.
	type OptimisticTimer = "idle" | "running" | "paused" | "stopped" | null;
	const [optimisticTimerState, setOptimisticTimerState] =
		useState<OptimisticTimer>(null);

	const [dueDatePickerOpen, setDueDatePickerOpen] = useState(false);

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

	useEffect(() => {
		if (!workingTask) {
			setSessionMs(0);
			sessionStartRef.current = null;
			baseSessionMsRef.current = 0;
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
		// No optimistic state needed — parent handles this via achievement queue
		await onCompleteTask(workingTask, sessionMs);
	}, [workingTask, sessionMs, onCompleteTask]);

	const handleReenter = useCallback(async () => {
		if (!workingTask) return;
		await onReenterTask(workingTask);
	}, [workingTask, onReenterTask]);

	const handleCancelTask = useCallback(async () => {
		if (!workingTask) return;
		await onCancelTask(workingTask, sessionMs);
	}, [workingTask, sessionMs, onCancelTask]);

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
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 flex-1 space-y-1 md:space-y-3">
						<div className="flex items-center gap-2 flex-wrap">
							{workingPamphlet && (
								<span
									className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-[0.15em] ${PAMPHLET_COLORS[workingPamphlet.color].bg} ${PAMPHLET_COLORS[workingPamphlet.color].text} ${PAMPHLET_COLORS[workingPamphlet.color].border} border`}
								>
									{workingPamphlet.name}
								</span>
							)}
							<p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground hidden md:block">
								Working On
							</p>
						</div>
						<p className="truncate text-base font-semibold tracking-tight text-foreground md:text-3xl md:tracking-[0.04em]">
							{workingTask.text}
						</p>
						<div className="flex items-center gap-2 relative">
							<p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground flex-shrink-0">
								{statusText}
							</p>

							{/* Clickable due date chip — shows current due date or an "add" prompt */}
							<button
								onClick={() => setDueDatePickerOpen((prev) => !prev)}
								className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border transition-colors flex-shrink-0
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

							{/* Due date picker popup */}
							{dueDatePickerOpen && (
								<DueDatePicker
									currentDueDate={workingTask.due_date}
									onSet={(isoDate) => onUpdateDueDate(workingTask.id, isoDate)}
									onClose={() => setDueDatePickerOpen(false)}
								/>
							)}
						</div>
					</div>
					<button
						onClick={handleCancelTask}
						className={iconBtn}
						title="Remove from working panel"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Timer display */}
				<div className="flex items-center gap-2 flex-wrap">
					<span
						className={`font-mono text-xl tracking-[0.12em] md:text-4xl md:tracking-[0.16em] ${isRunning ? "text-af4-highlight" : "text-foreground"}`}
					>
						{formatTimerDisplay(totalDisplayTime)}
					</span>
					{sessionMs > 0 && (
						<span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
							+{formatTimeCompact(sessionMs)}
						</span>
					)}
				</div>

				{/* Action buttons */}
				<div className="flex items-center gap-1.5 flex-wrap">
					{isIdle && (
						<>
							<button onClick={handleStartTimer} className={primaryBtn}>
								<Play className="h-3.5 w-3.5" />
								Start
							</button>
							<button onClick={handleComplete} className={secondaryBtn}>
								<Check className="h-3.5 w-3.5 text-[#8b9a6b]" />
								Complete
							</button>
						</>
					)}
					{isRunning && (
						<>
							<button onClick={handlePause} className={secondaryBtn}>
								<Pause className="h-3.5 w-3.5" />
								Pause
							</button>
							<button onClick={handleStop} className={secondaryBtn}>
								<Square className="h-3.5 w-3.5" />
								Stop
							</button>
							<button onClick={handleComplete} className={primaryBtn}>
								<Check className="h-3.5 w-3.5" />
								Complete
							</button>
						</>
					)}
					{isPaused && (
						<>
							<button onClick={handleResume} className={primaryBtn}>
								<Play className="h-3.5 w-3.5" />
								Resume
							</button>
							<button onClick={handleStop} className={secondaryBtn}>
								<Square className="h-3.5 w-3.5" />
								Stop
							</button>
							<button onClick={handleComplete} className={secondaryBtn}>
								<Check className="h-3.5 w-3.5 text-[#8b9a6b]" />
								Complete
							</button>
						</>
					)}
					{isStopped && (
						<>
							<button onClick={handleStartTimer} className={secondaryBtn}>
								<Play className="h-3.5 w-3.5" />
								Resume
							</button>
							<button onClick={handleComplete} className={primaryBtn}>
								<Check className="h-3.5 w-3.5" />
								Complete
							</button>
							<button onClick={handleReenter} className={secondaryBtn}>
								<RefreshCw className="h-3.5 w-3.5" />
								Re-enter
							</button>
						</>
					)}
				</div>

				<div className="h-px w-[20px] bg-border" />
			</div>
		</div>
	);
}
