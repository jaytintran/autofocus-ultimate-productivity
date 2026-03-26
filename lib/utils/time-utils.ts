import type { AppState } from "../types";

/**
 * Calculate current session milliseconds based on app state and current time
 */
export function getCurrentSessionMs(appState: AppState, nowMs: number): number {
	const baseSessionMs = appState.current_session_ms || 0;

	if (appState.timer_state !== "running" || !appState.session_start_time) {
		return baseSessionMs;
	}

	const sessionStartMs = new Date(appState.session_start_time).getTime();
	return baseSessionMs + Math.max(nowMs - sessionStartMs, 0);
}

/**
 * Format milliseconds to timer display (HH:MM:SS or MM:SS)
 */
export function formatTimerDisplay(totalMs: number): string {
	const totalSeconds = Math.floor(totalMs / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
	}
	return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Format milliseconds to compact display (e.g., "5m 30s", "1h 30m")
 */
export function formatTimeCompact(totalMs: number): string {
	if (totalMs === 0) return "";

	const totalSeconds = Math.floor(totalMs / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}

	return `${minutes}m ${seconds}s`;
}

/**
 * Calculate relative age string from ISO date string
 */
export function getTaskAge(addedAt: string): string {
	const now = new Date();
	const added = new Date(addedAt);
	const diffMs = now.getTime() - added.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Yesterday";
	if (diffDays < 7) return `${diffDays}d ago`;
	if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
	if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
	return `${Math.floor(diffDays / 365)}y ago`;
}

/**
 * Format a due date ISO string into a precise countdown string.
 * Used for tooltips and accessibility labels.
 * e.g. "Due in 2 days, 4 hours" or "Overdue by 30 minutes"
 */
export function formatDueDateVerbose(
	dueDateIso: string,
	now: Date = new Date(),
): string {
	const due = new Date(dueDateIso);
	const diffMs = due.getTime() - now.getTime();
	const abs = Math.abs(diffMs);

	const days = Math.floor(abs / (1000 * 60 * 60 * 24));
	const hours = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	const minutes = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));

	const parts: string[] = [];
	if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
	if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
	if (minutes > 0 && days === 0)
		parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
	if (parts.length === 0) parts.push("less than a minute");

	const joined = parts.join(", ");
	return diffMs < 0 ? `Overdue by ${joined}` : `Due in ${joined}`;
}
