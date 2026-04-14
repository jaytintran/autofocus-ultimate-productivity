import { useState, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import type { Book } from "@/lib/db/books";
import { BookCard } from "./book-card";
import { sortByPriority } from "./book-helpers";

export function DomainView({
	domain,
	books,
	search,
	onBookClick,
}: {
	domain: string;
	books: Book[];
	search: string;
	onBookClick: (book: Book) => void;
}) {
	const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
		new Set(),
	);

	const filtered = useMemo(() => {
		if (!search.trim()) return books;
		const q = search.toLowerCase();
		return books.filter(
			(b) =>
				b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q),
		);
	}, [books, search]);

	// Group books by tags
	const groupedBooks = useMemo(() => {
		const groups: {
			tag: string | null;
			books: Book[];
		}[] = [];

		// Books without tags go first
		const untagged = filtered.filter((b) => !b.tags || b.tags.length === 0);
		if (untagged.length > 0) {
			groups.push({ tag: null, books: untagged.sort(sortByPriority) });
		}

		// Group books by their tags
		const tagMap = new Map<string, Book[]>();
		filtered.forEach((book) => {
			if (book.tags && book.tags.length > 0) {
				book.tags.forEach((tag) => {
					if (!tagMap.has(tag)) {
						tagMap.set(tag, []);
					}
					tagMap.get(tag)!.push(book);
				});
			}
		});

		// Sort tags alphabetically and add to groups
		Array.from(tagMap.keys())
			.sort()
			.forEach((tag) => {
				groups.push({
					tag,
					books: tagMap.get(tag)!.sort(sortByPriority),
				});
			});

		return groups;
	}, [filtered]);

	const total = filtered.length;

	const toggleSection = (tag: string | null) => {
		const key = tag ?? "__untagged__";
		setCollapsedSections((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	const isSectionCollapsed = (tag: string | null) => {
		const key = tag ?? "__untagged__";
		return collapsedSections.has(key);
	};

	return (
		<div className="px-4 sm:px-6 py-6 pb-10 space-y-6">
			{total === 0 && (
				<p className="text-sm text-muted-foreground">
					No books match your search.
				</p>
			)}

			{/* Grouped sections */}
			{groupedBooks.map((group) => {
				const collapsed = isSectionCollapsed(group.tag);
				return (
					<div key={group.tag ?? "__untagged__"} className="space-y-3">
						{/* Section header */}
						<button
							onClick={() => toggleSection(group.tag)}
							className="flex items-center gap-2 w-full group"
						>
							<ChevronRight
								className={`w-4 h-4 text-muted-foreground transition-transform ${collapsed ? "" : "rotate-90"}`}
							/>
							<h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">
								{group.tag ?? "Untagged"}
							</h3>
							<span className="text-[10px] text-muted-foreground/40 tabular-nums">
								{group.books.length}
							</span>
							<div className="flex-1 h-px bg-border/40" />
						</button>

						{/* Books grid */}
						{!collapsed && (
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
								{group.books.map((book) => (
									<BookCard
										key={book.id}
										book={book}
										onClick={() => onBookClick(book)}
									/>
								))}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
