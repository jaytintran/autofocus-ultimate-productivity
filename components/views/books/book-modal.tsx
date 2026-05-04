import { useState, useMemo } from "react";
import type { Book, BookStatus } from "@/lib/db/books";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { Star, X, RefreshCw } from "lucide-react";
import { parseDueDateShortcut } from "@/lib/utils/due-date-parser";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "./book-constants";
import { TagChipSelector } from "./tag-chip-selector";

export function BookModal({
	book,
	onClose,
	onUpdate,
	onDelete,
	onStatusChange,
	allBooks,
	allDomains,
}: {
	book: Book;
	onClose: () => void;
	onUpdate: (id: string, updates: Partial<Book>) => Promise<void>;
	onDelete: (id: string) => Promise<void>;
	onStatusChange: (id: string, status: BookStatus) => Promise<void>;
	allBooks: Book[];
	allDomains: string[];
}) {
	const [domains, setDomains] = useState<string[]>(
		Array.isArray(book.domain) ? book.domain : [book.domain]
	);
	const [tags, setTags] = useState<string[]>(book.tags ?? []);
	const [notes, setNotes] = useState(book.notes ?? "");
	const [takeaways, setTakeaways] = useState(book.key_takeaways ?? "");
	const [currentPage, setCurrentPage] = useState(
		book.current_page?.toString() ?? "",
	);
	const [totalPages, setTotalPages] = useState(
		book.total_pages?.toString() ?? "",
	);
	const [isSaving, setIsSaving] = useState(false);
	const [localStatus, setLocalStatus] = useState<BookStatus>(book.status);
	const [rating, setRating] = useState<number | null>(book.rating ?? null);
	const [title, setTitle] = useState(book.title);
	const [author, setAuthor] = useState(book.author);

	const progress =
		totalPages && currentPage
			? Math.min(
					100,
					Math.round((parseInt(currentPage) / parseInt(totalPages)) * 100),
				)
			: null;

	// Get all tags from books in the same domain
	const domainTags = useMemo(() => {
		if (domains.length === 0) return [];
		const all = allBooks
			.filter((b) => {
				const bookDomains = Array.isArray(b.domain) ? b.domain : [b.domain];
				return domains.some((d) => bookDomains.includes(d)) && b.tags;
			})
			.flatMap((b) => b.tags as string[]);
		return Array.from(new Set(all)).sort();
	}, [allBooks, domains]);

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await onUpdate(book.id, {
				title: title.trim() || book.title,
				author: author.trim() || book.author,
				domain: domains,
				notes: notes.trim() || null,
				key_takeaways: takeaways.trim() || null,
				current_page: currentPage ? parseInt(currentPage) : null,
				total_pages: totalPages ? parseInt(totalPages) : null,
				tags: tags.length ? tags : null,
				rating: rating,
			});
			if (localStatus !== book.status) {
				await onStatusChange(book.id, localStatus);
			}
			onClose();
		} finally {
			setIsSaving(false);
		}
	};

	const priority = book.priority ? PRIORITY_CONFIG[book.priority] : null;

	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[580px] max-w-[calc(100vw-2rem)] p-0 overflow-hidden max-h-[90vh] flex flex-col">
				{/* Header */}
				<DialogHeader />
				<div className="px-6 pt-5 pb-4 flex-shrink-0 space-y-4">
					<div>
						<DialogTitle>
							<input
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								className="text-base font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-ring focus:outline-none transition-colors w-full pr-6"
							/>
						</DialogTitle>
						<input
							value={author}
							onChange={(e) => setAuthor(e.target.value)}
							className="text-sm text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-ring focus:outline-none transition-colors w-full mt-1"
						/>
					</div>

					{/* Meta info section */}
					<div className="space-y-3">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium">
								Meta
							</span>
							{priority && (
								<span
									className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${priority.color} ${priority.bg}`}
								>
									{priority.label}
								</span>
							)}
							{(Array.isArray(book.domain) ? book.domain : [book.domain]).map((d) => (
								<span key={d} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
									{d}
								</span>
							))}
							<span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
								{book.book_type}
							</span>
						</div>

						{/* Domains Editor */}
						<div>
							<label className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-1.5 block">
								Domains
							</label>
							<MultiSelect
								value={domains}
								onChange={setDomains}
								options={allDomains}
								placeholder="Select domains..."
								allowCustom={true}
							/>
						</div>

						{/* Rating selector */}
						<div className="flex items-center gap-2">
							<span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium">
								Rating
							</span>
							<div className="flex items-center gap-0.5">
								{Array.from({ length: 5 }).map((_, i) => (
									<button
										key={i}
										type="button"
										onClick={() => setRating(rating === i + 1 ? null : i + 1)}
										className="hover:scale-110 transition-transform"
									>
										<Star
											className={`w-4 h-4 ${
												rating && i < rating
													? "fill-amber-400 text-amber-400"
													: "text-muted-foreground/20 hover:text-amber-400/50"
											}`}
										/>
									</button>
								))}
								{rating && (
									<button
										type="button"
										onClick={() => setRating(null)}
										className="ml-1 text-[10px] text-muted-foreground/40 hover:text-foreground"
									>
										<X className="w-3 h-3" />
									</button>
								)}
							</div>
						</div>
					</div>

					{/* Reading status section */}
					<div className="bg-secondary/30 rounded-lg px-3 py-3 space-y-2">
						<div className="flex items-center gap-2">
							<span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium">
								Reading Status
							</span>
						</div>
						<div className="flex items-center gap-1.5 flex-wrap">
							{(Object.keys(STATUS_CONFIG) as BookStatus[]).map((s) => {
								const cfg = STATUS_CONFIG[s];
								return (
									<button
										key={s}
										type="button"
										onClick={() => setLocalStatus(s)}
										className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
											localStatus === s
												? `border-foreground/30 bg-foreground/10 ${cfg.text}`
												: "border-border text-muted-foreground hover:border-foreground/20"
										}`}
									>
										{cfg.label}
									</button>
								);
							})}
						</div>
					</div>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 border-t border-border/60 pt-4 bg-secondary/20">
					{/* Tags */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Tags
						</label>
						<TagChipSelector
							domainTags={domainTags}
							selected={tags}
							onChange={setTags}
						/>
					</div>

					{/* Progress */}
					{(localStatus === "reading" || localStatus === "completed") && (
						<div className="space-y-1.5">
							<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
								Progress
							</label>
							<div className="flex items-center gap-2">
								<input
									type="number"
									value={currentPage}
									onChange={(e) => setCurrentPage(e.target.value)}
									placeholder="Page"
									className="w-20 bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
								/>
								<span className="text-muted-foreground text-sm">/</span>
								<input
									type="number"
									value={totalPages}
									onChange={(e) => setTotalPages(e.target.value)}
									placeholder="Total"
									className="w-24 bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
								/>
								{progress !== null && (
									<span className="text-sm text-[#8b9a6b] font-medium">
										{progress}%
									</span>
								)}
							</div>
							{progress !== null && (
								<div className="h-1.5 bg-secondary rounded-full overflow-hidden">
									<div
										className="h-full bg-[#8b9a6b] rounded-full transition-all"
										style={{ width: `${progress}%` }}
									/>
								</div>
							)}
						</div>
					)}

					{/* Notes */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Notes
						</label>
						<textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Raw thoughts while reading..."
							rows={4}
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
						/>
					</div>

					{/* Key Takeaways */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Key Takeaways
						</label>
						<textarea
							value={takeaways}
							onChange={(e) => setTakeaways(e.target.value)}
							placeholder="Distilled lessons, one per line..."
							rows={4}
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
						/>
					</div>

					{/* Actions */}
					<div className="flex items-center justify-between pt-1">
						<button
							type="button"
							onClick={async () => {
								onClose();
								await onDelete(book.id);
							}}
							className="text-xs text-muted-foreground/50 hover:text-destructive transition-colors"
						>
							Delete book
						</button>
						<div className="flex gap-2">
							<Button variant="outline" size="sm" onClick={onClose}>
								Cancel
							</Button>
							<Button size="sm" onClick={handleSave} disabled={isSaving}>
								{isSaving ? "Saving..." : "Save"}
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
