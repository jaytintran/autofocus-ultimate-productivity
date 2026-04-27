"use client";

import { useState } from "react";
import { NoteInputSection } from "@/components/views/timer/note-input-section";
import { useNoteEntries } from "@/components/views/timer/use-note-entries";
import { useSidequest } from "@/components/views/timer/use-sidequest";
import type { Task } from "@/lib/types";
import type { TagId } from "@/lib/tags";

interface LogsPanelProps {
	onAddLoggedActivity: (
		text: string,
		tag?: TagId | null,
		note?: string | null,
		completedAt?: string | null,
		source?: "log" | "task",
	) => Promise<Task>;
	workingTask: Task | null;
	activeTasks: Task[];
	onCompleteAdjacentTask: (taskId: string | null, text: string) => Promise<void>;
}

export function LogsPanel({
	onAddLoggedActivity,
	workingTask,
	activeTasks,
	onCompleteAdjacentTask,
}: LogsPanelProps) {
	const sessionMs = 0; // No session tracking in logs panel

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
	} = useNoteEntries({
		effectiveWorkingTask: workingTask,
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
		effectiveWorkingTask: workingTask,
		onCompleteAdjacentTask,
		onSidequestComplete: () => {},
	});

	return (
		<div className="flex flex-col h-full">
			<div className="p-4 flex-1 min-h-0 flex flex-col">
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
	);
}
