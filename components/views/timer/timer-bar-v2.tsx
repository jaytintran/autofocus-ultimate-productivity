// NEWEST AND UPDATED - REFACTORED

"use client";

import { useState, useCallback } from "react";
import { formatTimeCompact } from "@/lib/utils/time-utils";
import type { TimerBarProps } from "./timer-bar.types";
import { IdleInput } from "./idle-input";
import { WorkingTaskDisplay } from "./working-task-display";
import { NoteInputSection } from "./note-input-section";
import { ResetConfirmationDialog } from "./reset-confirmation-dialog";
import { useTimerState } from "./use-timer-state";
import { useNoteEntries } from "./use-note-entries";
import { useSidequest } from "./use-sidequest";

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
	onResetTime,
}: TimerBarProps) {
	const [isReentering, setIsReentering] = useState(false);
	const [showResetConfirm, setShowResetConfirm] = useState(false);
	const [dueDatePickerOpen, setDueDatePickerOpen] = useState(false);
	const [note, setNote] = useState("");

	// ── Custom Hooks ───────────────────────────────────────────────────────────
	const {
		effectiveWorkingTask,
		setOptimisticWorkingTask,
		timerState,
		isRunning,
		sessionMs,
		handleStartTimer,
		handlePause,
		handleResume,
		handleStop,
	} = useTimerState({
		workingTask,
		appState,
		onStartTimer,
		onPauseTimer,
		onResumeTimer,
		onStopTimer,
	});

	const {
		noteEntries,
		noteInput,
		setNoteInput,
		noteType,
		setNoteType,
		mobileNotesOpen,
		setMobileNotesOpen,
		editingNoteId,
		editingNoteText,
		handleNoteSubmit,
		handleNoteEditStart,
		handleNoteEditChange,
		handleNoteEditSave,
		handleNoteEditCancel,
		handleNoteDelete,
		clearNoteEntries,
		addSidequestEntry,
	} = useNoteEntries({
		effectiveWorkingTask,
		sessionMs,
	});

	const {
		sidequestInput,
		sidequestMatches,
		sidequestSubmitting,
		handleSidequestChange,
		handleSidequestSubmit,
		clearSidequest,
	} = useSidequest({
		activeTasks,
		effectiveWorkingTask,
		onCompleteAdjacentTask,
		onSidequestComplete: addSidequestEntry,
	});

	// ── Handlers ───────────────────────────────────────────────────────────────

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

		// INSTANT UI UPDATE
		const taskToComplete = effectiveWorkingTask;
		const sessionToLog = sessionMs;
		setNote("");
		clearNoteEntries();
		setOptimisticWorkingTask(null);

		// Background async work
		onCompleteTask(taskToComplete, sessionToLog, combinedNote).catch(() => {
			setOptimisticWorkingTask(taskToComplete);
			setNote(combinedNote);
		});
	}, [
		effectiveWorkingTask,
		sessionMs,
		note,
		noteEntries,
		onCompleteTask,
		setOptimisticWorkingTask,
		clearNoteEntries,
	]);

	const handleReenter = useCallback(async () => {
		if (!effectiveWorkingTask || isReentering) return;
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
		setNote("");
		clearNoteEntries();
		clearSidequest();

		// IMMEDIATELY switch to idle state
		setOptimisticWorkingTask(null);
		setIsReentering(true);

		try {
			await onReenterTask(effectiveWorkingTask, combinedNote);
		} catch {
			setOptimisticWorkingTask(effectiveWorkingTask);
		} finally {
			setIsReentering(false);
		}
	}, [
		effectiveWorkingTask,
		noteEntries,
		note,
		onReenterTask,
		isReentering,
		setOptimisticWorkingTask,
		clearNoteEntries,
		clearSidequest,
	]);

	const handleCancelTask = useCallback(async () => {
		if (!effectiveWorkingTask) return;

		// INSTANT UI UPDATE
		const taskToCancel = effectiveWorkingTask;
		const sessionToLog = sessionMs;
		setOptimisticWorkingTask(null);

		// Background async work
		onCancelTask(taskToCancel, sessionToLog).catch(() => {
			setOptimisticWorkingTask(taskToCancel);
		});
	}, [effectiveWorkingTask, sessionMs, onCancelTask, setOptimisticWorkingTask]);

	const handleResetTime = useCallback(async () => {
		if (!effectiveWorkingTask) return;

		// If timer is running or paused, stop it first
		if (timerState === "running" || timerState === "paused") {
			await handleStop();
		}

		// Show confirmation dialog
		setShowResetConfirm(true);
	}, [effectiveWorkingTask, timerState, handleStop]);

	const handleConfirmReset = useCallback(async () => {
		if (!effectiveWorkingTask) return;
		setShowResetConfirm(false);
		await onResetTime(effectiveWorkingTask.id);
	}, [effectiveWorkingTask, onResetTime]);

	const handleCancelReset = useCallback(() => {
		setShowResetConfirm(false);
	}, []);

	// ── Idle state ─────────────────────────────────────────────────────────────
	if (!effectiveWorkingTask) {
		return (
			<IdleInput
				activeTasks={activeTasks}
				onAddTaskAndStart={onAddTaskAndStart}
				onStartTask={onStartTask}
			/>
		);
	}

	// ── Working state ──────────────────────────────────────────────────────────
	const totalDisplayTime = effectiveWorkingTask.total_time_ms + sessionMs;

	return (
		<div className="w-full bg-card md:px-4 py-3 h-full flex items-center">
			<div className="flex flex-col gap-3 md:gap-2 w-full md:w-auto px-4 md:px-0">
				{/* Task info + Timer + Actions */}
				<WorkingTaskDisplay
					effectiveWorkingTask={effectiveWorkingTask}
					totalDisplayTime={totalDisplayTime}
					isRunning={isRunning}
					timerState={timerState}
					isReentering={isReentering}
					pamphlets={pamphlets}
					dueDatePickerOpen={dueDatePickerOpen}
					setDueDatePickerOpen={setDueDatePickerOpen}
					onCancelTask={handleCancelTask}
					onUpdateDueDate={onUpdateDueDate}
					onUpdateTaskTag={onUpdateTaskTag}
					onStartTimer={handleStartTimer}
					onPause={handlePause}
					onResume={handleResume}
					onStop={handleStop}
					onComplete={handleComplete}
					onReenter={handleReenter}
					onResetTime={handleResetTime}
				/>

				{/* Note input + display - Hidden in panel mode, shown in mobile */}
				<div className="md:hidden">
					<NoteInputSection
						noteType={noteType}
						setNoteType={setNoteType}
						noteInput={noteInput}
						setNoteInput={setNoteInput}
						handleNoteSubmit={handleNoteSubmit}
						sidequestInput={sidequestInput}
						sidequestMatches={sidequestMatches}
						sidequestSubmitting={sidequestSubmitting}
						handleSidequestChange={handleSidequestChange}
						handleSidequestSubmit={handleSidequestSubmit}
						clearSidequestMatches={clearSidequest}
						noteEntries={noteEntries}
						mobileNotesOpen={mobileNotesOpen}
						setMobileNotesOpen={setMobileNotesOpen}
						editingNoteId={editingNoteId}
						editingNoteText={editingNoteText}
						onEditStart={handleNoteEditStart}
						onEditChange={handleNoteEditChange}
						onEditSave={handleNoteEditSave}
						onEditCancel={handleNoteEditCancel}
						onDelete={handleNoteDelete}
					/>
				</div>
			</div>

			{/* Reset Time Confirmation Dialog */}
			<ResetConfirmationDialog
				isOpen={showResetConfirm}
				totalTimeMs={effectiveWorkingTask.total_time_ms}
				onConfirm={handleConfirmReset}
				onCancel={handleCancelReset}
			/>
		</div>
	);
}
