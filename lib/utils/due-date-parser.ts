/**
 * due-date-parser.ts
 * Parses inline due date shortcuts from task input text.
 *
 * Supported formats (case-insensitive, triggered by "!"):
 *   !30m          → 30 minutes from now
 *   !2h           → 2 hours from now
 *   !1h30m        → 1 hour and 30 minutes from now
 *   !3d           → 3 days from now
 *   !2w           → 2 weeks from now
 *
 * The token can appear anywhere in the string.
 * Only the FIRST match is used; subsequent tokens are left as-is.
 *
 * Usage:
 *   const { cleanText, dueDate, dueDateLabel } = parseDueDateShortcut("Fix login bug !2d");
 *   // cleanText  → "Fix login bug"
 *   // dueDate    → Date (2 days from now)
 *   // dueDateLabel → "in 2 days"
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedDueDate {
	/** Input text with the matched token removed and whitespace cleaned up */
	cleanText: string;
	/** Resolved Date, or null if no valid token was found */
	dueDate: Date | null;
	/** Human-readable preview label, e.g. "in 2 days" or "in 3h 30m" */
	dueDateLabel: string | null;
}

// ---------------------------------------------------------------------------
// Regex
// ---------------------------------------------------------------------------

/**
 * Matches a due-date token starting with "!".
 * Groups:
 *   1 → weeks  (optional)
 *   2 → days   (optional)
 *   3 → hours  (optional)
 *   4 → minutes (optional)
 *
 * Valid examples: !2w, !3d, !4h, !30m, !1h30m, !2d4h, !1w2d3h30m
 * At least one unit must be present, otherwise no match.
 */
const DUE_DATE_REGEX =
	/!(?:(\d+)w)?(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?=[^a-zA-Z]|$)/i;

// ---------------------------------------------------------------------------
// Core parser
// ---------------------------------------------------------------------------

export function parseDueDateShortcut(
	input: string,
	now: Date = new Date(),
): ParsedDueDate {
	const match = DUE_DATE_REGEX.exec(input);

	if (!match) {
		return { cleanText: input, dueDate: null, dueDateLabel: null };
	}

	const [fullMatch, rawWeeks, rawDays, rawHours, rawMinutes] = match;

	// Require at least one unit to be present — bare "!" should be ignored
	if (!rawWeeks && !rawDays && !rawHours && !rawMinutes) {
		return { cleanText: input, dueDate: null, dueDateLabel: null };
	}

	const weeks = rawWeeks ? parseInt(rawWeeks, 10) : 0;
	const days = rawDays ? parseInt(rawDays, 10) : 0;
	const hours = rawHours ? parseInt(rawHours, 10) : 0;
	const minutes = rawMinutes ? parseInt(rawMinutes, 10) : 0;

	const totalMs =
		weeks * 7 * 24 * 60 * 60 * 1000 +
		days * 24 * 60 * 60 * 1000 +
		hours * 60 * 60 * 1000 +
		minutes * 60 * 1000;

	if (totalMs === 0) {
		return { cleanText: input, dueDate: null, dueDateLabel: null };
	}

	const dueDate = new Date(now.getTime() + totalMs);

	// Remove the token and clean up extra whitespace
	const cleanText = input
		.replace(fullMatch, "")
		.replace(/\s{2,}/g, " ")
		.trim();

	const dueDateLabel = buildPreviewLabel(weeks, days, hours, minutes);

	return { cleanText, dueDate, dueDateLabel };
}

// ---------------------------------------------------------------------------
// Preview label (shown in the input bar while typing)
// ---------------------------------------------------------------------------

function buildPreviewLabel(
	weeks: number,
	days: number,
	hours: number,
	minutes: number,
): string {
	const parts: string[] = [];

	if (weeks > 0) parts.push(`${weeks}w`);
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);

	return `in ${parts.join(" ")}`;
}

// ---------------------------------------------------------------------------
// Countdown formatter (used in task rows)
// ---------------------------------------------------------------------------

export type DueDateUrgency = "overdue" | "soon" | "normal" | "far";

export interface FormattedDueDate {
	label: string;
	urgency: DueDateUrgency;
}

/**
 * Formats a stored due date ISO string into a display label + urgency level.
 *
 * Urgency thresholds:
 *   overdue  → past due (red)
 *   soon     → within 24 hours (amber)
 *   normal   → within 7 days (default foreground)
 *   far      → beyond 7 days (muted)
 */
export function formatDueDate(
	dueDateIso: string,
	now: Date = new Date(),
): FormattedDueDate {
	const due = new Date(dueDateIso);
	const diffMs = due.getTime() - now.getTime();

	if (diffMs < 0) {
		return { label: "overdue", urgency: "overdue" };
	}

	const diffMinutes = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

	// < 1 hour: show minutes
	if (diffMinutes < 60) {
		return {
			label: `${diffMinutes}m`,
			urgency: "soon",
		};
	}

	// < 24 hours: show hours (and leftover minutes if meaningful)
	if (diffHours < 24) {
		const leftoverMinutes = diffMinutes % 60;
		const label =
			leftoverMinutes > 0
				? `${diffHours}h ${leftoverMinutes}m`
				: `${diffHours}h`;
		return { label, urgency: "soon" };
	}

	// < 7 days: show days
	if (diffDays < 7) {
		const leftoverHours = Math.floor(
			(diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
		);
		const label =
			leftoverHours > 0 ? `${diffDays}d ${leftoverHours}h` : `${diffDays}d`;
		return { label, urgency: "normal" };
	}

	// >= 7 days: show calendar date
	const label = due.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});
	return { label, urgency: "far" };
}

// ---------------------------------------------------------------------------
// Detect whether the current input contains an in-progress "!" token
// (useful for showing/hiding the preview badge reactively)
// ---------------------------------------------------------------------------

/**
 * Returns true if the input contains a complete, parseable due-date token.
 * Use this to decide whether to render the preview badge.
 */
export function hasDueDateToken(input: string): boolean {
	const { dueDate } = parseDueDateShortcut(input);
	return dueDate !== null;
}
