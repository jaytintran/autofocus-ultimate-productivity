import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { Task } from "@/lib/types";
import { getDateKey } from "./utils";

export function useSevenDayColumns(filteredTasks: Task[]) {
	return useMemo(() => {
		const today = new Date();
		return Array.from({ length: 7 }, (_, i) => {
			const date = new Date(today);
			date.setDate(today.getDate() - i);
			const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
			const dayName =
				i === 0
					? "Today"
					: i === 1
						? "Yesterday"
						: date.toLocaleDateString("en-GB", { weekday: "short" });
			const dayNum = date.getDate().toString().padStart(2, "0");
			const month = (date.getMonth() + 1).toString().padStart(2, "0");
			return {
				key,
				label: dayName,
				date: `${dayNum}/${month}`,
				tasks: filteredTasks.filter(
					(task) => task.completed_at && getDateKey(task.completed_at) === key,
				),
			};
		});
	}, [filteredTasks]);
}

export function useDeleteConfirmation() {
	const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
		null,
	);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	const requestDelete = useCallback((taskId: string) => {
		// Clear any existing timeout
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		setShowDeleteConfirm(taskId);

		// Set new timeout
		timeoutRef.current = setTimeout(() => {
			setShowDeleteConfirm(null);
		}, 5000);
	}, []);

	const clearDelete = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		setShowDeleteConfirm(null);
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return { showDeleteConfirm, requestDelete, clearDelete };
}

export function useClipboardCopy() {
	const [copiedDateKey, setCopiedDateKey] = useState<string | null>(null);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	const copy = useCallback((dateKey: string) => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		setCopiedDateKey(dateKey);

		timeoutRef.current = setTimeout(() => {
			setCopiedDateKey(null);
		}, 2000);
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return { copiedDateKey, copy };
}
