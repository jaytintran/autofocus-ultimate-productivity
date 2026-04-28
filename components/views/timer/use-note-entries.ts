import { useState, useCallback, useEffect } from "react";
import type { Task } from "@/lib/types";
import type { NoteEntry } from "./timer-bar.types";

interface UseNoteEntriesProps {
	effectiveWorkingTask: Task | null;
	sessionMs: number;
}

export function useNoteEntries({
	effectiveWorkingTask,
	sessionMs,
}: UseNoteEntriesProps) {
	const [noteEntries, setNoteEntries] = useState<NoteEntry[]>([]);

	// Load persisted note entries when task changes
	useEffect(() => {
		if (effectiveWorkingTask?.note) {
			try {
				const parsed = JSON.parse(effectiveWorkingTask.note);
				if (Array.isArray(parsed)) {
					setNoteEntries(parsed);
				} else {
					// If it's already formatted text (not JSON array), clear entries
					setNoteEntries([]);
				}
			} catch {
				// Not JSON, it's formatted text - clear entries
				setNoteEntries([]);
			}
		} else {
			setNoteEntries([]);
		}
	}, [effectiveWorkingTask?.id]);
	const [noteInput, setNoteInput] = useState("");
	const [noteType, setNoteType] = useState<"log" | "achievement" | "sidequest">(
		"log",
	);
	const [mobileNotesOpen, setMobileNotesOpen] = useState(false);
	const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
	const [editingNoteText, setEditingNoteText] = useState("");

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

	const handleNoteEditStart = useCallback((id: string, text: string) => {
		setEditingNoteId(id);
		setEditingNoteText(text);
	}, []);

	const handleNoteEditChange = useCallback((text: string) => {
		setEditingNoteText(text);
	}, []);

	const handleNoteEditSave = useCallback((id: string, text: string) => {
		setNoteEntries((prev) =>
			prev.map((n) => (n.id === id ? { ...n, text } : n)),
		);
		setEditingNoteId(null);
		setEditingNoteText("");
	}, []);

	const handleNoteEditCancel = useCallback(() => {
		setEditingNoteId(null);
		setEditingNoteText("");
	}, []);

	const handleNoteDelete = useCallback((id: string) => {
		setNoteEntries((prev) => prev.filter((n) => n.id !== id));
		setEditingNoteId(null);
		setEditingNoteText("");
	}, []);

	const clearNoteEntries = useCallback(() => {
		setNoteEntries([]);
		setNoteInput("");
		setNoteType("log");
	}, []);

	const addSidequestEntry = useCallback(
		(text: string) => {
			setNoteEntries((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					elapsedMs: (effectiveWorkingTask?.total_time_ms ?? 0) + sessionMs,
					text,
					type: "sidequest",
				},
			]);
		},
		[effectiveWorkingTask, sessionMs],
	);

	return {
		noteEntries,
		setNoteEntries,
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
	};
}
