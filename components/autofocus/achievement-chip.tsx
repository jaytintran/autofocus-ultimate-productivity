"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { AchievementPending, Pamphlet } from "@/lib/types";
import { PAMPHLET_COLORS } from "@/lib/pamphlet-colors";

// ─── Constants ────────────────────────────────────────────────────────────────

const DISMISS_MS = 5000;
const TICK_MS = 20;
const STEP = (TICK_MS / DISMISS_MS) * 100; // progress units per tick

// ─── Props ────────────────────────────────────────────────────────────────────

interface AchievementChipProps {
	queue: AchievementPending[];
	onCommit: (item: AchievementPending, note: string) => Promise<void>;
	onDismissAll: (queue: AchievementPending[]) => Promise<void>;
	pamphlets: Pamphlet[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AchievementChip({
	queue,
	onCommit,
	onDismissAll,
	pamphlets,
}: AchievementChipProps) {
	const [expanded, setExpanded] = useState(false);
	const [note, setNote] = useState("");
	const [progress, setProgress] = useState(100); // 100 = full, 0 = expired
	const [paused, setPaused] = useState(false);

	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const queueRef = useRef(queue);
	const onDismissAllRef = useRef(onDismissAll);

	// Keep refs in sync so interval callbacks don't stale-close
	useEffect(() => {
		queueRef.current = queue;
	}, [queue]);
	useEffect(() => {
		onDismissAllRef.current = onDismissAll;
	}, [onDismissAll]);

	const current = queue[0] ?? null;
	const count = queue.length;

	// ── Reset timer whenever a new item enters the queue ─────────────────────
	// This covers: first item arriving AND each subsequent completion
	const prevCountRef = useRef(0);
	useEffect(() => {
		if (count > prevCountRef.current) {
			// New task just arrived — reset to full and unpause
			setProgress(100);
			setPaused(false);
			setExpanded(false);
			setNote("");
		}
		prevCountRef.current = count;
	}, [count]);

	// ── Tick ──────────────────────────────────────────────────────────────────
	const startTimer = useCallback(() => {
		if (timerRef.current) clearInterval(timerRef.current);
		timerRef.current = setInterval(() => {
			if (paused) return;
			setProgress((prev) => {
				const next = prev - STEP;
				if (next <= 0) {
					clearInterval(timerRef.current!);
					timerRef.current = null;
					// Dismiss entire queue
					return 0;
				}
				return next;
			});
		}, TICK_MS);
	}, [paused]);

	useEffect(() => {
		if (count === 0) {
			if (timerRef.current) clearInterval(timerRef.current);
			return;
		}
		startTimer();
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [count, startTimer]);

	// Pause/resume when `paused` flips
	useEffect(() => {
		if (count === 0) return;
		if (paused) {
			if (timerRef.current) clearInterval(timerRef.current);
		} else {
			startTimer();
		}
	}, [paused, count, startTimer]);

	useEffect(() => {
		if (progress > 0) return;
		if (queueRef.current.length === 0) return;

		onDismissAllRef.current(queueRef.current).catch(console.error);
	}, [progress]);

	// ── Interaction ───────────────────────────────────────────────────────────
	const handleExpandClick = () => {
		setExpanded(true);
		setPaused(true);
	};

	const handleSkip = async () => {
		if (!current) return;
		setExpanded(false);
		setNote("");
		await onCommit(current, "");
		// If more in queue, unpause for the next one
		if (count > 1) {
			setProgress(100);
			setPaused(false);
		}
	};

	const handleSave = async () => {
		if (!current) return;
		setExpanded(false);
		const savedNote = note.trim();
		setNote("");
		await onCommit(current, savedNote);
		if (count > 1) {
			setProgress(100);
			setPaused(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") handleSave();
		if (e.key === "Escape") handleSkip();
	};

	// ── Nothing to show ───────────────────────────────────────────────────────
	if (count === 0) return null;

	const taskLabel = current?.task.text ?? "";
	const taskPamphlet =
		pamphlets.find((p) => p.id === current?.task.pamphlet_id) ?? null;

	// ── Render ────────────────────────────────────────────────────────────────
	return (
		<AnimatePresence>
			{count > 0 && (
				<motion.div
					key="achievement-chip"
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 8 }}
					transition={{ type: "spring", stiffness: 420, damping: 30 }}
					className="absolute top-10 left-1/2 -translate-x-1/2 md:top-auto md:bottom-6 md:left-6 md:translate-x-0 md:translate-y-0 z-10 px-3 pb-2 w-full max-w-md"
				>
					{/* Queue badge */}
					{count > 1 && (
						<motion.div
							key={count}
							initial={{ scale: 0.6, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							className="absolute -top-2 right-2 z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-background bg-foreground text-[10px] font-medium text-background"
						>
							{count}
						</motion.div>
					)}

					<div className="overflow-hidden rounded-[10px] border border-border bg-card shadow-sm">
						{/* Progress bar */}
						<div className="h-[2px] w-full bg-muted">
							<div
								className="h-full rounded-full bg-muted-foreground/50 transition-none"
								style={{ width: `${progress}%` }}
							/>
						</div>

						<div className="px-3 py-2.5">
							{!expanded ? (
								// ── Collapsed ──────────────────────────────────────────────
								<div className="flex items-center gap-2.5">
									<CheckCircle />
									<div className="flex flex-col flex-1 min-w-0">
										<span className="truncate text-[13px] text-foreground">
											{taskLabel}
										</span>
										{taskPamphlet && (
											<span
												className={`text-[10px] font-medium ${PAMPHLET_COLORS[taskPamphlet.color].text}`}
											>
												{taskPamphlet.name}
											</span>
										)}
									</div>
									<button
										onClick={handleExpandClick}
										className="shrink-0 rounded-md border border-border px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:border-border/80 hover:bg-muted hover:text-foreground"
									>
										Add a note →
									</button>
								</div>
							) : (
								// ── Expanded ───────────────────────────────────────────────
								<div className="flex flex-col gap-2">
									<div className="flex items-center gap-2.5">
										<CheckCircle />
										<div className="flex flex-col flex-1 min-w-0">
											<span className="truncate text-[13px] text-foreground">
												{taskLabel}
											</span>
											{taskPamphlet && (
												<span
													className={`text-[10px] font-medium ${PAMPHLET_COLORS[taskPamphlet.color].text}`}
												>
													{taskPamphlet.name}
												</span>
											)}
										</div>
									</div>
									<input
										autoFocus
										type="text"
										value={note}
										onChange={(e) => setNote(e.target.value)}
										onKeyDown={handleKeyDown}
										placeholder="What did you accomplish?"
										className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
									/>
									<div className="flex justify-end gap-2">
										<button
											onClick={handleSkip}
											className="rounded-md px-3 py-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
										>
											Skip
										</button>
										<button
											onClick={handleSave}
											className="rounded-md border border-border bg-background px-3 py-1 text-[12px] text-foreground transition-colors hover:bg-muted"
										>
											Save note
										</button>
									</div>
								</div>
							)}
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

// ─── Small check icon ─────────────────────────────────────────────────────────

function CheckCircle() {
	return (
		<div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-border bg-muted">
			<svg
				width="10"
				height="10"
				viewBox="0 0 10 10"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M2 5L4.2 7.5L8 3"
					stroke="currentColor"
					strokeWidth="1.4"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="text-muted-foreground"
				/>
			</svg>
		</div>
	);
}
