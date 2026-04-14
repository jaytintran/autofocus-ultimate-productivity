import { useState, useMemo } from "react";
import { BookOpen, Flame, CheckCircle2, Circle } from "lucide-react";
import type { Book } from "@/lib/db/books";
import { BookCard } from "./book-card";
import { sortByPriority } from "./book-helpers";

export function DashboardView({
	books,
	search,
	onBookClick,
}: {
	books: Book[];
	search: string;
	onBookClick: (book: Book) => void;
}) {
	const stats = useMemo(
		() => ({
			total: books.length,
			reading: books.filter((b) => b.status === "reading").length,
			completed: books.filter((b) => b.status === "completed").length,
			unread: books.filter((b) => b.status === "unread").length,
		}),
		[books],
	);

	const currentlyReading = useMemo(
		() => books.filter((b) => b.status === "reading").sort(sortByPriority),
		[books],
	);

	const filteredBooks = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return [];

		return books.filter(
			(b) =>
				b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q),
		);
	}, [books, search]);

	const isSearching = search.trim().length > 0;

	return (
		<div className="px-4 sm:px-6 py-6 pb-10 space-y-8">
			{/* Stats grid */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				{[
					{
						label: "Total Books",
						value: stats.total,
						icon: BookOpen,
						color: "text-foreground",
						bg: "bg-secondary/60",
					},
					{
						label: "Reading",
						value: stats.reading,
						icon: Flame,
						color: "text-sky-500",
						bg: "bg-sky-500/10",
					},
					{
						label: "Completed",
						value: stats.completed,
						icon: CheckCircle2,
						color: "text-[#8b9a6b]",
						bg: "bg-[#8b9a6b]/10",
					},
					{
						label: "Not Started",
						value: stats.unread,
						icon: Circle,
						color: "text-muted-foreground",
						bg: "bg-secondary/60",
					},
				].map(({ label, value, icon: Icon, color, bg }) => (
					<div
						key={label}
						className={`${bg} rounded-xl p-4 flex flex-col gap-2`}
					>
						<Icon className={`w-4 h-4 ${color}`} />
						<p className={`text-2xl font-bold ${color}`}>{value}</p>
						<p className="text-[11px] text-muted-foreground/70 uppercase tracking-wider">
							{label}
						</p>
					</div>
				))}
			</div>

			{isSearching && filteredBooks.length > 0 && (
				<div className="space-y-3">
					<h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
						Search Results
					</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{filteredBooks.map((book) => (
							<BookCard
								key={book.id}
								book={book}
								onClick={() => onBookClick(book)}
							/>
						))}
					</div>
				</div>
			)}

			{/* Currently Reading */}
			{currentlyReading.length > 0 && (
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<Flame className="w-3.5 h-3.5 text-sky-500" />
						<h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
							Currently Reading
						</h3>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{currentlyReading.map((book) => (
							<BookCard
								key={book.id}
								book={book}
								onClick={() => onBookClick(book)}
							/>
						))}
					</div>
				</div>
			)}
			{/* Completed */}
			{(() => {
				const completed = books
					.filter((b) => b.status === "completed")
					.sort(sortByPriority);
				return completed.length > 0 ? (
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<CheckCircle2 className="w-3.5 h-3.5 text-[#8b9a6b]" />
							<h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
								Completed
							</h3>
							<span className="text-[10px] text-muted-foreground/40 tabular-nums">
								{completed.length}
							</span>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
							{completed.map((book) => (
								<BookCard
									key={book.id}
									book={book}
									onClick={() => onBookClick(book)}
								/>
							))}
						</div>
					</div>
				) : null;
			})()}
		</div>
	);
}
