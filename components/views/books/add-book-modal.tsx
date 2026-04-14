import { useState, useMemo, useEffect } from "react";
import type { Book } from "@/lib/db/books";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, X } from "lucide-react";
import { PRIORITY_CONFIG } from "./book-constants";
import { TagChipSelector } from "./tag-chip-selector";

export function AddBookModal({
	onClose,
	onAdd,
	domains,
	books,
}: {
	onClose: () => void;
	onAdd: (
		book: Omit<Book, "id" | "created_at" | "updated_at">,
	) => Promise<void>;
	domains: string[];
	books: Book[];
}) {
	const [title, setTitle] = useState("");
	const [author, setAuthor] = useState("");
	const [domain, setDomain] = useState("");
	const [showNewDomain, setShowNewDomain] = useState(false);
	const [tags, setTags] = useState<string[]>([]);
	const [priority, setPriority] = useState<Book["priority"]>("MEDIUM");
	const [bookType, setBookType] = useState<Book["book_type"]>("Core");
	const [totalPages, setTotalPages] = useState("");
	const [rating, setRating] = useState<number | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		setTags([]);
	}, [domain]);

	const domainTags = useMemo(() => {
		if (!domain || domain === "__new__") return [];
		const all = books
			.filter((b) => b.domain === domain && b.tags)
			.flatMap((b) => b.tags as string[]);
		return Array.from(new Set(all)).sort();
	}, [books, domain]);

	const handleSubmit = async () => {
		if (!title.trim() || !author.trim() || !domain.trim()) return;
		setSaving(true);
		try {
			await onAdd({
				title: title.trim(),
				author: author.trim(),
				domain: domain.trim(),
				tags: tags.length ? tags : null,
				priority,
				rating: rating,
				book_type: bookType,
				status: "unread",
				started_at: null,
				finished_at: null,
				current_page: null,
				total_pages: totalPages ? parseInt(totalPages) : null,
				notes: null,
				key_takeaways: null,
				cover_url: null,
			});
			onClose();
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[520px] max-w-[calc(100vw-2rem)] p-0 overflow-hidden max-h-[90vh] flex flex-col">
				<div className="px-6 pt-5 pb-4 flex-shrink-0">
					<DialogHeader>
						<DialogTitle>Add Book</DialogTitle>
					</DialogHeader>
				</div>

				<div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 border-t border-border/60 pt-4 bg-secondary/20">
					{/* Title */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Title *
						</label>
						<input
							autoFocus
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Book title"
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
						/>
					</div>
					{/* Author */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Author *
						</label>
						<input
							value={author}
							onChange={(e) => setAuthor(e.target.value)}
							placeholder="Author name"
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
						/>
					</div>
					{/* Domain */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Domain *
						</label>
						{showNewDomain ? (
							<div className="flex gap-2">
								<input
									autoFocus
									value={domain}
									onChange={(e) => setDomain(e.target.value)}
									placeholder="New domain name"
									className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
								/>
								<button
									type="button"
									onClick={() => {
										setShowNewDomain(false);
										setDomain("");
									}}
									className="text-xs text-muted-foreground hover:text-foreground"
								>
									Cancel
								</button>
							</div>
						) : (
							<select
								value={domain}
								onChange={(e) => {
									if (e.target.value === "__new__") {
										setShowNewDomain(true);
										setDomain("");
									} else setDomain(e.target.value);
								}}
								className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
							>
								<option value="">Select a domain...</option>
								{domains.map((d) => (
									<option key={d} value={d}>
										{d}
									</option>
								))}
								<option value="__new__">+ Create new domain</option>
							</select>
						)}
					</div>
					{/* Tags */}
					{domain && !showNewDomain && (
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
					)}

					{/* Priority */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Priority
						</label>
						<div className="flex flex-wrap gap-1.5">
							{(
								["CRITICAL", "HIGH", "MEDIUM", "SUPPLEMENTAL", "LOW"] as const
							).map((p) => {
								const cfg = PRIORITY_CONFIG[p];
								return (
									<button
										key={p}
										type="button"
										onClick={() => setPriority(p)}
										className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
											priority === p
												? `border-foreground/30 bg-foreground/10 ${cfg.color}`
												: "border-border text-muted-foreground hover:border-foreground/20"
										}`}
									>
										{p}
									</button>
								);
							})}
						</div>
					</div>
					{/* Book Type */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Type
						</label>
						<div className="flex gap-1.5">
							{(["Core", "Optional", "Extension"] as const).map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => setBookType(t)}
									className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
										bookType === t
											? "border-foreground/30 bg-foreground/10 text-foreground"
											: "border-border text-muted-foreground hover:border-foreground/20"
									}`}
								>
									{t}
								</button>
							))}
						</div>
					</div>
					{/* Total Pages */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Total Pages
						</label>
						<input
							type="number"
							value={totalPages}
							onChange={(e) => setTotalPages(e.target.value)}
							placeholder="e.g. 320"
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
						/>
					</div>
					{/* Rating */}
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Rating
						</label>
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
					{/* Actions */}
					<div className="flex justify-end gap-2 pt-1">
						<Button variant="outline" size="sm" onClick={onClose}>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={handleSubmit}
							disabled={
								saving || !title.trim() || !author.trim() || !domain.trim()
							}
						>
							{saving ? "Adding..." : "Add Book"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
