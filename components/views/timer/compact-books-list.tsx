"use client";

import { useMemo, useState } from "react";
import { BookOpen, Star, ChevronDown, ChevronRight } from "lucide-react";
import type { Book, BookStatus } from "@/lib/db/books";
import { STATUS_CONFIG } from "@/components/views/books/book-constants";

interface CompactBooksListProps {
	books: Book[];
	onBookClick?: (book: Book) => void;
	onStatusChange?: (id: string, status: BookStatus) => void;
}

export function CompactBooksList({
	books,
	onBookClick,
	onStatusChange,
}: CompactBooksListProps) {
	const [statusDropdown, setStatusDropdown] = useState<string | null>(null);
	const [showCompleted, setShowCompleted] = useState(false);
	const [showNotStarted, setShowNotStarted] = useState(false);

	const readingBooks = useMemo(
		() => books.filter((b) => b.status === "reading"),
		[books],
	);

	const notStartedBooks = useMemo(
		() => books.filter((b) => b.status === "unread"),
		[books],
	);

	const completedBooks = useMemo(
		() => books.filter((b) => b.status === "completed"),
		[books],
	);

	const handleStatusClick = (e: React.MouseEvent, bookId: string) => {
		e.stopPropagation();
		setStatusDropdown(statusDropdown === bookId ? null : bookId);
	};

	const handleStatusChange = (
		e: React.MouseEvent,
		bookId: string,
		status: BookStatus,
	) => {
		e.stopPropagation();
		onStatusChange?.(bookId, status);
		setStatusDropdown(null);
	};

	if (readingBooks.length === 0 && completedBooks.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
				<BookOpen className="w-6 h-6 opacity-20" />
				<p className="text-xs">No books yet</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{/* Reading Books */}
			{readingBooks.length > 0 && (
				<div className="flex flex-col gap-2">
					{readingBooks.map((book) => {
						const progress =
							book.total_pages && book.current_page
								? Math.min(
										100,
										Math.round((book.current_page / book.total_pages) * 100),
									)
								: null;

						const status = STATUS_CONFIG[book.status];

						return (
							<div
								key={book.id}
								onClick={() => onBookClick?.(book)}
								className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-border/80 hover:bg-accent/30 transition-all cursor-pointer min-h-[100px]"
							>
								{/* Book icon */}
								<div className="w-10 h-10 rounded-md bg-[#8b9a6b]/10 flex items-center justify-center flex-shrink-0">
									<BookOpen className="w-5 h-5 text-[#8b9a6b]" />
								</div>

								{/* Content */}
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-foreground truncate mb-1">
										{book.title}
									</p>
									<p className="text-[10px] text-muted-foreground/60 truncate mb-2">
										{book.author}
									</p>

									{/* Progress bar */}
									{progress !== null && (
										<div className="flex items-center gap-2 mt-auto">
											<div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
												<div
													className="h-full bg-[#8b9a6b] rounded-full transition-all"
													style={{ width: `${progress}%` }}
												/>
											</div>
											<span className="text-[9px] text-[#8b9a6b] font-medium">
												{progress}%
											</span>
										</div>
									)}

									<div className="flex flex-row justify-between items-center">
										{/* Status badge - top right corner */}
										<div className="top-3 right-3 z-10">
											<button
												onClick={(e) => handleStatusClick(e, book.id)}
												className={`flex items-center gap-1 text-[9px] font-medium px-3 py-1.5 cursor-pointer rounded-full ${status.bg} ${status.text} hover:opacity-80 transition-opacity`}
											>
												<div className={`w-1 h-1 rounded-full ${status.dot}`} />
												{status.label}
											</button>

											{/* Status dropdown */}
											{statusDropdown === book.id && (
												<div className="absolute top-full right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[120px] z-50">
													{(Object.keys(STATUS_CONFIG) as BookStatus[]).map(
														(statusKey) => {
															const statusOption = STATUS_CONFIG[statusKey];
															return (
																<button
																	key={statusKey}
																	onClick={(e) =>
																		handleStatusChange(e, book.id, statusKey)
																	}
																	className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-2 ${
																		book.status === statusKey
																			? "bg-accent/50"
																			: ""
																	}`}
																>
																	<div
																		className={`w-1.5 h-1.5 rounded-full ${statusOption.dot}`}
																	/>
																	{statusOption.label}
																</button>
															);
														},
													)}
												</div>
											)}
										</div>

										{/* Rating - bottom right corner */}
										{book.rating && (
											<div className="bottom-3 right-3 flex items-center gap-0.5">
												{Array.from({ length: 5 }).map((_, i) => (
													<Star
														key={i}
														className={`w-2.5 h-2.5 ${i < Math.round(book.rating!) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`}
													/>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}


		{/* Not Started Books Section */}
		{notStartedBooks.length > 0 && (
			<div className="flex flex-col gap-2 mt-2">
				<button
					onClick={() => setShowNotStarted(!showNotStarted)}
					className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1"
				>
					{showNotStarted ? (
						<ChevronDown className="w-3 h-3" />
					) : (
						<ChevronRight className="w-3 h-3" />
					)}
					Not Started ({notStartedBooks.length})
				</button>

				{showNotStarted && (
					<div className="flex flex-col gap-2">
						{notStartedBooks.map((book) => {
							const status = STATUS_CONFIG[book.status];

							return (
								<div
									key={book.id}
									onClick={() => onBookClick?.(book)}
									className="group relative flex items-start gap-3 p-4 rounded-lg border border-border hover:border-border/80 hover:bg-accent/30 transition-all cursor-pointer opacity-60 hover:opacity-100 min-h-[100px]"
								>
									{/* Status badge - top right */}
									<div className="absolute top-3 right-3 z-10">
										<button
											onClick={(e) => handleStatusClick(e, book.id)}
											className={`flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.text} hover:opacity-80 transition-opacity`}
										>
											<div className={`w-1 h-1 rounded-full ${status.dot}`} />
											{status.label}
										</button>

										{statusDropdown === book.id && (
											<div className="absolute top-full right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[120px] z-50">
												{(Object.keys(STATUS_CONFIG) as BookStatus[]).map(
													(statusKey) => {
														const statusOption = STATUS_CONFIG[statusKey];
														return (
															<button
																key={statusKey}
																onClick={(e) =>
																	handleStatusChange(e, book.id, statusKey)
																}
																className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-2 ${
																	book.status === statusKey
																		? "bg-accent/50"
																		: ""
																}`}
															>
																<div
																	className={`w-1.5 h-1.5 rounded-full ${statusOption.dot}`}
																/>
																{statusOption.label}
															</button>
														);
													},
												)}
											</div>
										)}
									</div>

									{/* Rating - bottom right corner */}
									{book.rating && (
										<div className="absolute bottom-3 right-3 flex items-center gap-0.5">
											{Array.from({ length: 5 }).map((_, i) => (
												<Star
													key={i}
													className={`w-2.5 h-2.5 ${i < Math.round(book.rating!) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`}
												/>
											))}
										</div>
									)}

									{/* Book icon */}
									<div className="w-10 h-10 rounded-md bg-[#8b9a6b]/10 flex items-center justify-center flex-shrink-0">
										<BookOpen className="w-5 h-5 text-[#8b9a6b]" />
									</div>

									{/* Content */}
									<div className="flex-1 min-w-0 pr-24">
										<p className="text-sm font-medium text-muted-foreground truncate mb-1">
											{book.title}
										</p>
										<p className="text-[10px] text-muted-foreground/60 truncate">
											{book.author}
										</p>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		)}
			{/* Completed Books Section */}
			{completedBooks.length > 0 && (
				<div className="flex flex-col gap-2 mt-2">
					<button
						onClick={() => setShowCompleted(!showCompleted)}
						className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1"
					>
						{showCompleted ? (
							<ChevronDown className="w-3 h-3" />
						) : (
							<ChevronRight className="w-3 h-3" />
						)}
						Completed Books ({completedBooks.length})
					</button>

					{showCompleted && (
						<div className="flex flex-col gap-2">
							{completedBooks.map((book) => {
								const status = STATUS_CONFIG[book.status];

								return (
									<div
										key={book.id}
										onClick={() => onBookClick?.(book)}
										className="group relative flex items-start gap-3 p-4 rounded-lg border border-border hover:border-border/80 hover:bg-accent/30 transition-all cursor-pointer opacity-60 hover:opacity-100 min-h-[100px]"
									>
										{/* Status badge - top right */}
										<div className="absolute top-3 right-3 z-10">
											<button
												onClick={(e) => handleStatusClick(e, book.id)}
												className={`flex items-center gap-1 text-[9px] font-medium px-2.5 py-1.5 rounded-full ${status.bg} ${status.text} hover:opacity-80 transition-opacity`}
											>
												<div className={`w-1 h-1 rounded-full ${status.dot}`} />
												{status.label}
											</button>

											{statusDropdown === book.id && (
												<div className="absolute top-full right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[120px] z-50">
													{(Object.keys(STATUS_CONFIG) as BookStatus[]).map(
														(statusKey) => {
															const statusOption = STATUS_CONFIG[statusKey];
															return (
																<button
																	key={statusKey}
																	onClick={(e) =>
																		handleStatusChange(e, book.id, statusKey)
																	}
																	className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-2 ${
																		book.status === statusKey
																			? "bg-accent/50"
																			: ""
																	}`}
																>
																	<div
																		className={`w-1.5 h-1.5 rounded-full ${statusOption.dot}`}
																	/>
																	{statusOption.label}
																</button>
															);
														},
													)}
												</div>
											)}
										</div>

										{/* Rating - bottom right corner */}
										{book.rating && (
											<div className="absolute bottom-3 right-3 flex items-center gap-0.5">
												{Array.from({ length: 5 }).map((_, i) => (
													<Star
														key={i}
														className={`w-2.5 h-2.5 ${i < Math.round(book.rating!) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`}
													/>
												))}
											</div>
										)}

										{/* Book icon */}
										<div className="w-10 h-10 rounded-md bg-[#8b9a6b]/10 flex items-center justify-center flex-shrink-0">
											<BookOpen className="w-5 h-5 text-[#8b9a6b]" />
										</div>

										{/* Content */}
										<div className="flex-1 min-w-0 pr-24">
											<p className="text-sm font-medium text-muted-foreground truncate mb-1">
												{book.title}
											</p>
											<p className="text-[10px] text-muted-foreground/60 truncate">
												{book.author}
											</p>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
