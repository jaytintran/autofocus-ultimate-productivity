"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Pause, Play, Square, Check, RefreshCw, X } from "lucide-react";
import type { Task, AppState } from "@/lib/types";
import { reenterFromPanel } from "@/lib/store";

interface TimerBarProps {
	appState: AppState;
	workingTask: Task | null;
	onRefresh: () => Promise<void>;
	onStartTimer: () => Promise<void>;
	onPauseTimer: (sessionMs: number) => Promise<void>;
	onResumeTimer: () => Promise<void>;
	onStopTimer: (task: Task, sessionMs: number) => Promise<void>;
	onCompleteTask: (task: Task, sessionMs: number) => Promise<void>;
	onCancelTask: (task: Task, sessionMs: number) => Promise<void>;
}

// Format for active timer display: HH:MM:SS
function formatTimerDisplay(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// Format for task row display: 32m10s or 1h 14m
export function formatTimeCompact(ms: number): string {
	if (ms === 0) return "";

	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
	}

	if (minutes > 0) {
		return seconds > 0 ? `${minutes}m${seconds}s` : `${minutes}m`;
	}

	return `${seconds}s`;
}

export function TimerBar({
	appState,
	workingTask,
	onRefresh,
	onStartTimer,
	onPauseTimer,
	onResumeTimer,
	onStopTimer,
	onCompleteTask,
	onCancelTask,
}: TimerBarProps) {
	const [sessionMs, setSessionMs] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const sessionStartRef = useRef<number | null>(null);
	const baseSessionMsRef = useRef(0);
	const primaryButtonClass =
		"inline-flex items-center justify-center gap-2 rounded-sm border border-[#a3b56a]/40 bg-[#a3b56a] px-4 py-2 text-sm font-medium text-[#1f2414] transition-colors hover:bg-[#b2c777] disabled:cursor-not-allowed disabled:opacity-50";
	const secondaryButtonClass =
		"inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-transparent px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";
	const iconButtonClass =
		"inline-flex items-center justify-center rounded-sm border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50";

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
			await reenterFromPanel(workingTask.id, workingTask.text);
			await onRefresh();
		} finally {
			setIsLoading(false);
		}
	}, [workingTask, isLoading, onRefresh]);

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
		return (
			<div className="border-y border-border/80 bg-card px-6 py-6 md:px-10">
				<div className="mx-auto flex min-h-[112px] max-w-6xl items-center justify-center text-center">
					<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground md:text-base">
						- Select a Task to Begin Working On It -
					</p>
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
		<div className="border-y border-border/80 bg-card px-6 py-4 md:px-10">
			<div className="mx-auto flex max-w-6xl flex-col gap-4">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 flex-1 space-y-3">
						<p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
							Working On
						</p>
						<p className="truncate text-2xl font-semibold tracking-[0.04em] text-foreground md:text-3xl">
							{workingTask.text}
						</p>
						<div className="flex flex-wrap items-center gap-3">
							<span
								className={`font-mono text-3xl tracking-[0.16em] md:text-4xl ${isRunning ? "text-af4-highlight" : "text-foreground"}`}
							>
								{formatTimerDisplay(totalDisplayTime)}
							</span>
							{sessionMs > 0 && (
								<span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
									(+{formatTimeCompact(sessionMs)})
								</span>
							)}
						</div>
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

				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
						{statusText}
					</p>

					<div className="flex flex-wrap items-center gap-2 md:justify-end">
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
									title="Pause timer"
								>
									<Pause className="h-3.5 w-3.5" />
									Pause
								</button>
								<button
									onClick={handleStop}
									disabled={isLoading}
									className={secondaryButtonClass}
									title="Stop and save time"
								>
									<Square className="h-3.5 w-3.5" />
									Stop
								</button>
								<button
									onClick={handleComplete}
									disabled={isLoading}
									className={primaryButtonClass}
									title="Mark complete"
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
									title="Resume timer"
								>
									<Play className="h-3.5 w-3.5" />
									Resume
								</button>
								<button
									onClick={handleStop}
									disabled={isLoading}
									className={secondaryButtonClass}
									title="Stop and save time"
								>
									<Square className="h-3.5 w-3.5" />
									Stop
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

						{isStopped && (
							<>
								<button
									onClick={handleStartTimer}
									disabled={isLoading}
									className={secondaryButtonClass}
									title="Resume working"
								>
									<Play className="h-3.5 w-3.5" />
									Resume
								</button>
								<button
									onClick={handleComplete}
									disabled={isLoading}
									className={primaryButtonClass}
									title="Mark complete"
								>
									<Check className="h-3.5 w-3.5" />
									Complete
								</button>
								<button
									onClick={handleReenter}
									disabled={isLoading}
									className={secondaryButtonClass}
									title="Re-enter at end of list"
								>
									<RefreshCw className="h-3.5 w-3.5" />
									Re-enter
								</button>
							</>
						)}
					</div>
				</div>

				<div className="h-px w-full bg-border" />
			</div>
		</div>
	);
}
