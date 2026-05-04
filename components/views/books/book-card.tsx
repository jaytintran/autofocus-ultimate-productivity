import { Star } from "lucide-react";
import type { Book } from "@/lib/db/books";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "./book-constants";

export function BookCard({ book, onClick }: { book: Book; onClick: () => void }) {
	const status = STATUS_CONFIG[book.status];
	const priority = book.priority ? PRIORITY_CONFIG[book.priority] : null;
	const progress =
		book.total_pages && book.current_page
			? Math.min(100, Math.round((book.current_page / book.total_pages) * 100))
			: null;

	return (
		<div
			onClick={onClick}
			className="group relative bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-border/80 hover:bg-accent/30 transition-all duration-150 flex flex-col gap-3"
		>
			{/* Status + Priority row */}
			<div className="flex items-center justify-between gap-2">
				<div
					className={`flex items-center gap-1.5 text-[10px] font-medium ${status.text}`}
				>
					<div
						className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.dot}`}
					/>
					{status.label}
				</div>
				{priority && (
					<span
						className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${priority.color} ${priority.bg}`}
					>
						{priority.label}
					</span>
				)}
			</div>

			{/* Title + Author */}
			<div className="flex-1 min-w-0">
				<p
					className={`text-sm font-medium leading-snug line-clamp-2 ${book.status === "completed" ? "text-muted-foreground" : "text-foreground"}`}
				>
					{book.title}
				</p>
				<p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">
					{book.author}
				</p>
			</div>

			{/* Domains */}
			{book.domain.length > 0 && (
				<div className="flex items-center gap-1.5 flex-wrap">
					{(Array.isArray(book.domain) ? book.domain : [book.domain]).slice(0, 2).map((d) => (
						<span key={d} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
							{d}
						</span>
					))}
					{(Array.isArray(book.domain) ? book.domain : [book.domain]).length > 2 && (
						<span className="text-[10px] text-muted-foreground/60">
							+{(Array.isArray(book.domain) ? book.domain : [book.domain]).length - 2} more
						</span>
					)}
				</div>
			)}

			{/* Footer */}
			<div className="flex items-center justify-between gap-2">
				{book.rating ? (
					<div className="flex items-center gap-0.5">
						{Array.from({ length: 5 }).map((_, i) => (
							<Star
								key={i}
								className={`w-2.5 h-2.5 ${i < Math.round(book.rating!) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`}
							/>
						))}
					</div>
				) : (
					<span className="text-[10px] text-muted-foreground/30">
						{book.book_type}
					</span>
				)}

				{/* Progress bar */}
				{progress !== null && (
					<div className="flex items-center gap-1.5 flex-shrink-0">
						<div className="w-12 h-1 bg-secondary rounded-full overflow-hidden">
							<div
								className="h-full bg-[#8b9a6b] rounded-full transition-all"
								style={{ width: `${progress}%` }}
							/>
						</div>
						<span className="text-[10px] text-[#8b9a6b]">{progress}%</span>
					</div>
				)}
			</div>
		</div>
	);
}
