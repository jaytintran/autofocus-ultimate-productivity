"use client";

import { useMemo, useState, useEffect } from "react";
import { BookOpen, Search, X } from "lucide-react";
import type { Book, BookStatus } from "@/lib/db/books";
import { STATUS_CONFIG } from "@/components/views/books/book-constants";

interface CompactBooksListProps {
	books: Book[];
	onBookClick?: (book: Book) => void;
	onStatusChange?: (id: string, status: BookStatus) => void;
	searchQuery: string;
	onSearchChange: (query: string) => void;
	onAddBook: () => void;
}

export function CompactBooksList({
	books,
	onBookClick,
	searchQuery,
	onSearchChange,
	onAddBook,
}: CompactBooksListProps) {
	const [expandedStatuses, setExpandedStatuses] = useState<Set<BookStatus>>(() => {
		const saved = localStorage.getItem("timer-books-expanded");
		if (saved) {
			try {
				return new Set(JSON.parse(saved));
			} catch {
				return new Set();
			}
		}
		return new Set();
	});
	const [debouncedQuery, setDebouncedQuery] = useState("");

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	useEffect(() => {
		localStorage.setItem("timer-books-expanded", JSON.stringify(Array.from(expandedStatuses)));
	}, [expandedStatuses]);

	const filteredBooks = useMemo(() => {
		if (!debouncedQuery.trim()) return null;
		const query = debouncedQuery.toLowerCase();
		return books.filter(
			(b) =>
				b.title.toLowerCase().includes(query) ||
				b.author.toLowerCase().includes(query),
		);
	}, [books, debouncedQuery]);

	const groupedByStatus = useMemo(() => {
		const groups: Record<BookStatus, Book[]> = {
			reading: [],
			unread: [],
			completed: [],
			abandoned: [],
		};

		const booksToGroup = filteredBooks !== null ? filteredBooks : books;

		booksToGroup.forEach((book) => {
			groups[book.status].push(book);
		});

		return groups;
	}, [filteredBooks, books]);

	const statusOrder: BookStatus[] = ["reading", "unread", "completed", "abandoned"];

	if (books.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
				<BookOpen className="w-6 h-6 opacity-20" />
				<p className="text-xs">No books yet</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{/* Search Bar with Add Button */}
			<div className="flex items-center gap-2">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Search books..."
						className="w-full pl-9 pr-9 py-2 text-sm bg-secondary/50 border border-border rounded-lg outline-none focus:border-[#8b9a6b]/50 transition-colors placeholder:text-muted-foreground/50"
					/>
					{searchQuery && (
						<button
							onClick={() => onSearchChange("")}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					)}
				</div>
				<button
					onClick={onAddBook}
					className="px-3 py-2 bg-secondary/50 border border-border rounded-lg hover:bg-secondary transition-colors shrink-0 flex items-center gap-1.5 text-sm font-medium"
					title="Add Book"
				>
					<BookOpen className="w-3.5 h-3.5" />
					<span>Add</span>
				</button>
			</div>

			{/* Search Results */}
			{filteredBooks !== null ? (
				filteredBooks.length > 0 ? (
					<div className="grid grid-cols-3 gap-2">
						{filteredBooks.map((book) => {
							const progress =
								book.total_pages && book.current_page
									? Math.min(
											100,
											Math.round((book.current_page / book.total_pages) * 100),
										)
									: null;

							return (
								<button
									key={book.id}
									onClick={() => onBookClick?.(book)}
									className="w-full text-left px-2 py-1.5 hover:bg-accent rounded border border-border transition-colors group"
								>
									<div className="flex items-start gap-2">
										<BookOpen className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
										<div className="flex-1 min-w-0">
											<p className="text-xs font-medium text-foreground truncate group-hover:text-[#8b9a6b] transition-colors">
												{book.title}
											</p>
											<p className="text-[10px] text-muted-foreground truncate mt-0.5">
												{book.author}
											</p>
											{progress !== null && progress > 0 && (
												<div className="mt-1">
													<div className="h-1 bg-secondary rounded-full overflow-hidden">
														<div
															className="h-full bg-[#8b9a6b] rounded-full transition-all"
															style={{ width: `${progress}%` }}
														/>
													</div>
												</div>
											)}
										</div>
									</div>
								</button>
							);
						})}
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
						<Search className="w-6 h-6 opacity-20" />
						<p className="text-xs">No books match your search</p>
					</div>
				)
			) : (
				<>
					{/* Books by status */}
					<div className="space-y-2">
						{statusOrder.map((status) => {
							const statusBooks = groupedByStatus[status];
							if (statusBooks.length === 0) return null;

							const config = STATUS_CONFIG[status];
							const isExpanded = expandedStatuses.has(status);

							const toggleStatus = () => {
								setExpandedStatuses((prev) => {
									const next = new Set(prev);
									if (next.has(status)) {
										next.delete(status);
									} else {
										next.add(status);
									}
									return next;
								});
							};

							return (
								<div key={status} className="space-y-1">
									<button
										onClick={toggleStatus}
										className="w-full flex items-center justify-between px-2 py-1 hover:bg-accent rounded transition-colors"
									>
										<span
											className={`text-xs font-medium flex items-center gap-1.5 ${config.text}`}
										>
											<div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
											{config.label}
										</span>
										<span className="text-xs text-muted-foreground">
											{statusBooks.length}
										</span>
									</button>

									{isExpanded && (
										<div className="grid grid-cols-3 gap-2 pl-2">
											{statusBooks.map((book) => {
												const progress =
													book.total_pages && book.current_page
														? Math.min(
																100,
																Math.round(
																	(book.current_page / book.total_pages) * 100,
																),
															)
														: null;

												return (
													<button
														key={book.id}
														onClick={() => onBookClick?.(book)}
														className="w-full text-left px-2 py-1.5 hover:bg-accent rounded border border-border transition-colors group"
													>
														<div className="flex items-start gap-2">
															<BookOpen className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
															<div className="flex-1 min-w-0">
																<p className="text-xs font-medium text-foreground truncate group-hover:text-[#8b9a6b] transition-colors">
																	{book.title}
																</p>
																<p className="text-[10px] text-muted-foreground truncate mt-0.5">
																	{book.author}
																</p>
																{progress !== null && progress > 0 && (
																	<div className="mt-1">
																		<div className="h-1 bg-secondary rounded-full overflow-hidden">
																			<div
																				className="h-full bg-[#8b9a6b] rounded-full transition-all"
																				style={{ width: `${progress}%` }}
																			/>
																		</div>
																	</div>
																)}
															</div>
														</div>
													</button>
												);
											})}
										</div>
									)}
								</div>
							);
						})}
					</div>
				</>
			)}
		</div>
	);
}
