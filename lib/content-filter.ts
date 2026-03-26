import type { Task } from "@/lib/types";

export type ContentFilterOption =
	| "default"
	| "courses"
	| "projects"
	| "books";

export type ContentFilterPreset =
	| "exclude-all"
	| "show-all";

export interface ContentFilterState {
	options: ContentFilterOption[];
	preset?: ContentFilterPreset;
}

const COURSE_KEYWORDS = ["course", "courses"];
const PROJECT_KEYWORDS = ["project", "projects"];
const BOOK_KEYWORDS = ["book", "books"];

function matchesKeywords(text: string, keywords: string[]): boolean {
	const lower = text.toLowerCase();
	return keywords.some((kw) => {
		// Word-boundary match: keyword must be a whole word (space, start, end, punctuation)
		const regex = new RegExp(`(?:^|\\s|[^a-z])${kw}(?:$|\\s|[^a-z])`, "i");
		return regex.test(lower);
	});
}

export function isCourseTask(task: Task): boolean {
	return matchesKeywords(task.text, COURSE_KEYWORDS);
}

export function isProjectTask(task: Task): boolean {
	return matchesKeywords(task.text, PROJECT_KEYWORDS);
}

export function isBookTask(task: Task): boolean {
	return matchesKeywords(task.text, BOOK_KEYWORDS);
}

export function applyContentFilter(
	tasks: Task[],
	filter: ContentFilterState,
): Task[] {
	// Handle presets
	if (filter.preset === "exclude-all") {
		return tasks.filter(
			(t) => !isCourseTask(t) && !isProjectTask(t) && !isBookTask(t),
		);
	}

	if (filter.preset === "show-all") {
		return tasks;
	}

	// If no options selected and no preset, show all
	if (filter.options.length === 0) {
		return tasks;
	}

	// Filter by selected options (OR logic - show tasks matching ANY selected option)
	return tasks.filter((task) => {
		const isCourse = isCourseTask(task);
		const isProject = isProjectTask(task);
		const isBook = isBookTask(task);

		// Check if task matches any of the selected filters
		if (filter.options.includes("courses") && isCourse) return true;
		if (filter.options.includes("projects") && isProject) return true;
		if (filter.options.includes("books") && isBook) return true;

		return false;
	});
}