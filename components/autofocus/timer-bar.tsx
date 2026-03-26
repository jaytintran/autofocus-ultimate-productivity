"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
	Pause,
	Play,
	Square,
	Check,
	RefreshCw,
	X,
	Send,
	Keyboard,
	KeyboardIcon,
} from "lucide-react";
import type { Task, AppState } from "@/lib/types";
import { TAG_DEFINITIONS, getTagDefinition, type TagId } from "@/lib/tags";
import { formatTimeCompact } from "@/lib/utils/time-utils";

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
	onAddTaskAndStart: (text: string, tag?: TagId | null) => Promise<Task | null>;
}

// Format for active timer display: HH:MM:SS
function formatTimerDisplay(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

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
}: TimerBarProps) {
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

	const [sessionMs, setSessionMs] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const sessionStartRef = useRef<number | null>(null);
	const baseSessionMsRef = useRef(0);
	const [focusQuery, setFocusQuery] = useState("");
	const [focusInlineTag, setFocusInlineTag] = useState<TagId | null>(null);
	const [focusMentionQuery, setFocusMentionQuery] = useState<string | null>(
		null,
	);
	const focusInputRef = useRef<HTMLInputElement>(null);

	const primaryButtonClass =
		"inline-flex items-center justify-center gap-2 rounded-sm border border-[#a3b56a]/40 bg-[#a3b56a] px-4 py-2 text-sm font-medium text-[#1f2414] transition-colors hover:bg-[#b2c777] disabled:cursor-not-allowed disabled:opacity-50";
	const secondaryButtonClass =
		"inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-transparent px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";
	const iconButtonClass =
		"inline-flex items-center justify-center rounded-sm border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50";

	const [debouncedFocusQuery, setDebouncedFocusQuery] = useState("");

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedFocusQuery(focusQuery);
		}, 500);
		return () => clearTimeout(timer);
	}, [focusQuery]);

	const focusMatches = debouncedFocusQuery.trim()
		? activeTasks
				.filter((t) =>
					t.text.toLowerCase().includes(debouncedFocusQuery.toLowerCase()),
				)
				.slice(0, 6)
		: [];

	const focusTagDef = focusInlineTag ? getTagDefinition(focusInlineTag) : null;
	const focusMentionResults =
		focusMentionQuery !== null
			? TAG_DEFINITIONS.filter((t) =>
					t.id.startsWith(focusMentionQuery.toLowerCase()),
				)
			: [];

	// Calculate current session time
	useEffect(() => {
		if (!workingTask) {
			setSessionMs(0);
			sessionStartRef.current = null;
			baseSessionMsRef.current = 0;
			return;
		}

		// If timer is running, start the interval
		if (appState.timer_state === "running") {
			const startTime = appState.session_start_time
				? new Date(appState.session_start_time).getTime()
				: Date.now();

			sessionStartRef.current = startTime;
			baseSessionMsRef.current = appState.current_session_ms;

			const interval = setInterval(() => {
				const now = Date.now();
				setSessionMs(
					baseSessionMsRef.current + (now - sessionStartRef.current!),
				);
			}, 100);

			return () => clearInterval(interval);
		} else if (appState.timer_state === "paused") {
			// Show accumulated session time when paused
			setSessionMs(appState.current_session_ms);
		} else {
			// idle or stopped - session is 0
			setSessionMs(0);
		}
	}, [
		workingTask,
		appState.timer_state,
		appState.session_start_time,
		appState.current_session_ms,
	]);

	const handleStartTimer = useCallback(async () => {
		if (isLoading) return;
		setIsLoading(true);
		try {
			await onStartTimer();
		} finally {
			setIsLoading(false);
		}
	}, [isLoading, onStartTimer]);

	const handlePause = useCallback(async () => {
		if (isLoading) return;
		setIsLoading(true);
		try {
			await onPauseTimer(sessionMs);
		} finally {
			setIsLoading(false);
		}
	}, [sessionMs, isLoading, onPauseTimer]);

	const handleResume = useCallback(async () => {
		if (isLoading) return;
		setIsLoading(true);
		try {
			await onResumeTimer();
		} finally {
			setIsLoading(false);
		}
	}, [isLoading, onResumeTimer]);

	const handleStop = useCallback(async () => {
		if (isLoading || !workingTask) return;
		setIsLoading(true);
		try {
			await onStopTimer(workingTask, sessionMs);
		} finally {
			setIsLoading(false);
		}
	}, [workingTask, sessionMs, isLoading, onStopTimer]);

	const handleComplete = useCallback(async () => {
		if (isLoading || !workingTask) return;
		setIsLoading(true);
		try {
			await onCompleteTask(workingTask, sessionMs);
		} finally {
			setIsLoading(false);
		}
	}, [workingTask, sessionMs, isLoading, onCompleteTask]);

	const handleReenter = useCallback(async () => {
		if (isLoading || !workingTask) return;
		setIsLoading(true);
		try {
			await onReenterTask(workingTask);
		} finally {
			setIsLoading(false);
		}
	}, [workingTask, isLoading, onReenterTask]);

	const handleCancelTask = useCallback(async () => {
		if (isLoading || !workingTask) return;
		setIsLoading(true);
		try {
			await onCancelTask(workingTask, sessionMs);
		} finally {
			setIsLoading(false);
		}
	}, [workingTask, sessionMs, isLoading, onCancelTask]);

	// No working task - show idle message
	if (!workingTask) {
		const handleFocusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value;
			setFocusQuery(value);

			const mentionMatch = value.match(/#(\w*)$/);
			setFocusMentionQuery(mentionMatch ? mentionMatch[1] : null);

			const { tag } = parseTagMention(value);
			setFocusInlineTag(tag);
		};

		const handleFocusSubmit = async () => {
			const trimmed = focusQuery.trim();
			if (!trimmed) return;

			const { tag, cleanText } = parseTagMention(trimmed);
			const finalTag = focusInlineTag ?? tag;
			const finalText = cleanText || trimmed;

			const EXEMPT = new Set([
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
			const capitalized = finalText
				.split(" ")
				.map((w, i) =>
					i === 0 || !EXEMPT.has(w.toLowerCase())
						? w.charAt(0).toUpperCase() + w.slice(1)
						: w.toLowerCase(),
				)
				.join(" ");

			setFocusQuery("");
			setFocusInlineTag(null);
			setFocusMentionQuery(null);

			await onAddTaskAndStart(capitalized, finalTag);
		};

		const handleFocusSelectExisting = async (task: Task) => {
			setFocusQuery("");
			setFocusInlineTag(null);
			setFocusMentionQuery(null);
			await onStartTask(task);
		};

		const handleFocusMentionSelect = (tagId: TagId) => {
			const cleanText = focusQuery.replace(/#\w*$/, "").trim();
			setFocusQuery(cleanText);
			setFocusInlineTag(tagId);
			setFocusMentionQuery(null);
			focusInputRef.current?.focus();
		};

		const handleFocusKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				if (focusMentionQuery !== null && focusMentionResults.length === 1) {
					handleFocusMentionSelect(focusMentionResults[0].id);
					return;
				}
				if (focusMatches.length === 1 && focusQuery.trim()) {
					handleFocusSelectExisting(focusMatches[0]);
					return;
				}
				handleFocusSubmit();
			}
			if (e.key === "Escape") {
				setFocusMentionQuery(null);
			}
		};

		return (
			<div className="border-y border-border/80 bg-card px-6 py-6 md:px-10">
				<div className="mx-auto flex max-w-6xl flex-col items-center gap-0 w-full">
					{/* <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
						What Are You Working On?
					</p> */}

					{/* Input */}
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
											handleFocusMentionSelect(tag.id);
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
							{/* Icon */}
							<KeyboardIcon className="w-5 h-5 text-muted-foreground" />

							{/* Inline tag pill */}
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
								ref={focusInputRef}
								type="text"
								value={focusQuery}
								onChange={handleFocusChange}
								onKeyDown={handleFocusKeyDown}
								placeholder="What are you working on? Search tasks, or type to create one — use # to tag"
								className="flex-1 bg-transparent border-none outline-none text-lg md:text-xl text-foreground placeholder:text-muted-foreground/50 placeholder:text-sm md:placeholder:text-base"
								autoFocus
							/>

							{focusQuery.trim() && (
								<button
									type="button"
									onClick={handleFocusSubmit}
									className="p-1.5 hover:bg-accent rounded-full transition-colors flex-shrink-0"
									title="Add as new task and start"
								>
									<Send className="w-4 h-4 text-[#8b9a6b]" />
								</button>
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
											onClick={() => handleFocusSelectExisting(task)}
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
										onClick={handleFocusSubmit}
										className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left border-t border-border text-muted-foreground"
									>
										<Send className="w-3 h-3 flex-shrink-0" />
										<span>
											Create &quot;{focusQuery.trim()}&quot; and start
										</span>
									</button>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		);
	}

	const timerState = appState.timer_state;
	const isIdle = timerState === "idle";
	const isRunning = timerState === "running";
	const isPaused = timerState === "paused";
	const isStopped = timerState === "stopped";

	// Calculate display time: current session + task's accumulated time
	const totalDisplayTime = workingTask.total_time_ms + sessionMs;
	const statusText = isRunning
		? "Timer running"
		: isPaused
			? "Timer paused"
			: isStopped
				? "Session saved"
				: "Ready to start";

	return (
		<div className="border-y border-border/80 bg-card px-4 py-3 md:px-10 md:py-4">
			<div className="mx-auto flex max-w-6xl flex-col gap-3">
				{/* Top row — task text + cancel */}
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 flex-1 space-y-1 md:space-y-3">
						<p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground hidden md:block">
							Working On
						</p>
						<p className="truncate text-base font-semibold tracking-tight text-foreground md:text-3xl md:tracking-[0.04em]">
							{workingTask.text}
						</p>
						<p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground flex-shrink-0">
							{statusText}
						</p>
					</div>

					<button
						onClick={handleCancelTask}
						disabled={isLoading}
						className={iconButtonClass}
						title="Remove from working panel"
						aria-label="Remove from working panel"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Middle row — timer + status */}
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2 flex-wrap">
						<span
							className={`font-mono text-xl tracking-[0.12em] md:text-4xl md:tracking-[0.16em] ${
								isRunning ? "text-af4-highlight" : "text-foreground"
							}`}
						>
							{formatTimerDisplay(totalDisplayTime)}
						</span>

						{sessionMs > 0 && (
							<span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
								+{formatTimeCompact(sessionMs)}
							</span>
						)}
					</div>
				</div>

				{/* Bottom row — action buttons */}
				<div className="flex items-center gap-1.5 flex-wrap">
					{isIdle && (
						<>
							<button
								onClick={handleStartTimer}
								disabled={isLoading}
								className={primaryButtonClass}
							>
								<Play className="h-3.5 w-3.5" />
								Start
							</button>
							<button
								onClick={handleComplete}
								disabled={isLoading}
								className={secondaryButtonClass}
								title="Mark complete"
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
								disabled={isLoading}
								className={secondaryButtonClass}
							>
								<Pause className="h-3.5 w-3.5" />
								Pause
							</button>
							<button
								onClick={handleStop}
								disabled={isLoading}
								className={secondaryButtonClass}
							>
								<Square className="h-3.5 w-3.5" />
								Stop
							</button>
							<button
								onClick={handleComplete}
								disabled={isLoading}
								className={primaryButtonClass}
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
								disabled={isLoading}
								className={primaryButtonClass}
							>
								<Play className="h-3.5 w-3.5" />
								Resume
							</button>
							<button
								onClick={handleStop}
								disabled={isLoading}
								className={secondaryButtonClass}
							>
								<Square className="h-3.5 w-3.5" />
								Stop
							</button>
							<button
								onClick={handleComplete}
								disabled={isLoading}
								className={secondaryButtonClass}
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
								disabled={isLoading}
								className={secondaryButtonClass}
							>
								<Play className="h-3.5 w-3.5" />
								Resume
							</button>
							<button
								onClick={handleComplete}
								disabled={isLoading}
								className={primaryButtonClass}
							>
								<Check className="h-3.5 w-3.5" />
								Complete
							</button>
							<button
								onClick={handleReenter}
								disabled={isLoading}
								className={secondaryButtonClass}
							>
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
