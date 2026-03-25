import type { Task } from "@/lib/types";

export type ContentFilterOption =
	| "default"
	| "courses"
	| "projects"
	| "books"
	| "both"
	| "hide-both";

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
	filter: ContentFilterOption,
): Task[] {
	switch (filter) {
		case "default":
			return tasks;

		case "courses":
			return tasks.filter(isCourseTask);

		case "projects":
			return tasks.filter(isProjectTask);

		case "books":
			return tasks.filter(isBookTask);

		case "both":
			return tasks.filter((t) => isCourseTask(t) || isProjectTask(t));

		case "hide-both":
			return tasks.filter(
				(t) => !isCourseTask(t) && !isProjectTask(t) && !isBookTask(t),
			);

		default:
			return tasks;
	}
}
