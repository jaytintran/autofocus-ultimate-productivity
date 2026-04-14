import type { Book } from "@/lib/db/books";
import { PRIORITY_CONFIG } from "./book-constants";

export function sortByPriority(a: Book, b: Book): number {
	const pa = PRIORITY_CONFIG[a.priority ?? "LOW"]?.order ?? 99;
	const pb = PRIORITY_CONFIG[b.priority ?? "LOW"]?.order ?? 99;
	return pa - pb || a.title.localeCompare(b.title);
}
