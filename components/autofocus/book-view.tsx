"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useBooks } from "@/hooks/use-books";
import type { Book, BookStatus, BookPriority } from "@/lib/books";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import {
	Brain,
	Code2,
	DollarSign,
	Heart,
	Globe,
	Lightbulb,
	BarChart2,
	Pen,
	Microscope,
	Dumbbell,
	Music,
	Cpu,
	BookOpen as BookOpenIcon,
	Layers as LayersIcon,
	Search,
	Plus,
	Star,
	BookOpen,
	X,
	Flame,
	CheckCircle2,
	Circle,
	BookMarked,
	Layers,
	Edit,
	Trash2,
	Menu,
	ChevronRight,
} from "lucide-react";

// ─── Domain Icons ─────────────────────────────────────────────────────

const DOMAIN_ICONS: Record<string, React.ElementType> = {
	psychology: Brain,
	philosophical: Lightbulb,
	programming: Code2,
	code: Code2,
	software: Code2,
	wealth: DollarSign,
	money: DollarSign,
	investing: BarChart2,
	trading: BarChart2,
	health: Heart,
	fitness: Dumbbell,
	science: Microscope,
	writing: Pen,
	music: Music,
	tech: Cpu,
	technology: Cpu,
	global: Globe,
	power: Globe,
	mental: Brain,
	reality: Flame,
};

function getDomainIcon(domain: string): React.ElementType {
	const lower = domain.toLowerCase();
	for (const [key, Icon] of Object.entries(DOMAIN_ICONS)) {
		if (lower.includes(key)) return Icon;
	}
	return BookOpenIcon;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
	BookStatus,
	{ label: string; dot: string; text: string; bg: string }
> = {
	unread: {
		label: "Not Started",
		dot: "bg-muted-foreground/30",
		text: "text-muted-foreground",
		bg: "bg-muted/50",
	},
	reading: {
		label: "Reading",
		dot: "bg-sky-500",
		text: "text-sky-500",
		bg: "bg-sky-500/10",
	},
	completed: {
		label: "Completed",
		dot: "bg-[#8b9a6b]",
		text: "text-[#8b9a6b]",
		bg: "bg-[#8b9a6b]/10",
	},
	abandoned: {
		label: "Abandoned",
		dot: "bg-muted-foreground/20",
		text: "text-muted-foreground/40",
		bg: "bg-muted/30",
	},
};

const PRIORITY_CONFIG: Record<
	string,
	{ label: string; color: string; bg: string; order: number }
> = {
	CRITICAL: {
		label: "CRITICAL",
		color: "text-red-500",
		bg: "bg-red-500/10",
		order: 0,
	},
	HIGH: {
		label: "HIGH",
		color: "text-orange-500",
		bg: "bg-orange-500/10",
		order: 1,
	},
	MEDIUM: {
		label: "MEDIUM",
		color: "text-amber-500",
		bg: "bg-amber-500/10",
		order: 2,
	},
	SUPPLEMENTAL: {
		label: "SUPP",
		color: "text-blue-400",
		bg: "bg-blue-400/10",
		order: 3,
	},
	LOW: {
		label: "LOW",
		color: "text-muted-foreground",
		bg: "bg-muted",
		order: 4,
	},
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortByPriority(a: Book, b: Book): number {
	const pa = PRIORITY_CONFIG[a.priority ?? "LOW"]?.order ?? 99;
	const pb = PRIORITY_CONFIG[b.priority ?? "LOW"]?.order ?? 99;
	return pa - pb || a.title.localeCompare(b.title);
}

// ─── Book Card ────────────────────────────────────────────────────────────────

function BookCard({ book, onClick }: { book: Book; onClick: () => void }) {
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

// ─── Book Detail Modal ────────────────────────────────────────────────────────

function BookModal({
	book,
	onClose,
	onUpdate,
	onDelete,
	onStatusChange,
}: {
	book: Book;
	onClose: () => void;
	onUpdate: (id: string, updates: Partial<Book>) => Promise<void>;
	onDelete: (id: string) => Promise<void>;
	onStatusChange: (id: string, status: BookStatus) => Promise<void>;
}) {
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

	const progress =
		totalPages && currentPage
			? Math.min(
					100,
					Math.round((parseInt(currentPage) / parseInt(totalPages)) * 100),
				)
			: null;

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await onUpdate(book.id, {
				notes: notes.trim() || null,
				key_takeaways: takeaways.trim() || null,
				current_page: currentPage ? parseInt(currentPage) : null,
				total_pages: totalPages ? parseInt(totalPages) : null,
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
				<div className="px-6 pt-5 pb-4 flex-shrink-0">
					<DialogHeader>
						<DialogTitle className="text-base leading-snug pr-6 text-foreground">
							{book.title}
						</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground mt-0.5">{book.author}</p>

					{/* Meta pills */}
					<div className="flex items-center gap-2 mt-3 flex-wrap">
						{priority && (
							<span
								className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${priority.color} ${priority.bg}`}
							>
								{priority.label}
							</span>
						)}
						<span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
							{book.domain}
						</span>
						{book.layer && (
							<span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
								{book.layer}
							</span>
						)}
						{book.rating && (
							<span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground flex items-center gap-1">
								<Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
								{book.rating}
							</span>
						)}
					</div>

					{/* Status selector */}
					<div className="flex items-center gap-1.5 mt-3 flex-wrap">
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

				{/* Body */}
				<div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 border-t border-border/60 pt-4 bg-secondary/20">
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

// ─── Add Book Modal ───────────────────────────────────────────────────────────

function AddBookModal({
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

	const [layer, setLayer] = useState("");
	const [priority, setPriority] = useState<Book["priority"]>("MEDIUM");

	const [bookType, setBookType] = useState<Book["book_type"]>("Core");
	const [totalPages, setTotalPages] = useState("");

	const [rating, setRating] = useState("");
	const [saving, setSaving] = useState(false);

	const [showNewDomain, setShowNewDomain] = useState(false);
	const [showNewLayer, setShowNewLayer] = useState(false);

	const existingLayers = useMemo(() => {
		if (!domain || showNewDomain) return [];
		return Array.from(
			new Set(
				books
					.filter((b) => b.domain === domain && b.layer)
					.map((b) => b.layer as string),
			),
		);
	}, [books, domain, showNewDomain]);

	useEffect(() => {
		setLayer("");
		setShowNewLayer(false);
	}, [domain]);

	const handleSubmit = async () => {
		if (!title.trim() || !author.trim() || !domain.trim()) return;
		setSaving(true);
		try {
			await onAdd({
				title: title.trim(),
				author: author.trim(),
				domain: domain.trim(),
				layer: layer.trim() || null,
				priority,
				rating: rating ? parseFloat(rating) : null,
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

					{/* Domain + Layer */}
					<div className="grid grid-cols-2 gap-3">
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
										} else {
											setDomain(e.target.value);
										}
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
						<div className="space-y-1.5">
							<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
								Layer
							</label>
							{showNewLayer ? (
								<div className="flex gap-2">
									<input
										autoFocus
										value={layer}
										onChange={(e) => setLayer(e.target.value)}
										placeholder="New layer name"
										className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
									/>
									<button
										type="button"
										onClick={() => {
											setShowNewLayer(false);
											setLayer("");
										}}
										className="text-xs text-muted-foreground hover:text-foreground"
									>
										Cancel
									</button>
								</div>
							) : (
								<select
									value={layer}
									disabled={!domain || showNewDomain}
									onChange={(e) => {
										if (e.target.value === "__new__") {
											setShowNewLayer(true);
											setLayer("");
										} else {
											setLayer(e.target.value);
										}
									}}
									className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40 disabled:cursor-not-allowed"
								>
									<option value="">No layer</option>
									{existingLayers.map((l) => (
										<option key={l} value={l}>
											{l}
										</option>
									))}
									<option value="__new__">+ Create new layer</option>
								</select>
							)}
						</div>
					</div>

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

					{/* Total Pages + Rating */}
					<div className="grid grid-cols-2 gap-3">
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
						<div className="space-y-1.5">
							<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
								Rating (0–5)
							</label>
							<input
								type="number"
								min="0"
								max="5"
								step="0.5"
								value={rating}
								onChange={(e) => setRating(e.target.value)}
								placeholder="e.g. 4.5"
								className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
							/>
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

// ─── Dashboard View ───────────────────────────────────────────────────────────

function DashboardView({
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

// ─── Domain View ──────────────────────────────────────────────────────────────

function DomainView({
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
	const filtered = useMemo(() => {
		if (!search.trim()) return books;
		const q = search.toLowerCase();
		return books.filter(
			(b) =>
				b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q),
		);
	}, [books, search]);

	// Group by layer — null layer books go first, unlabeled
	const grouped = useMemo(() => {
		const nullBooks = filtered.filter((b) => !b.layer).sort(sortByPriority);
		const layerMap = new Map<string, Book[]>();

		filtered
			.filter((b) => !!b.layer)
			.forEach((b) => {
				const l = b.layer!;
				if (!layerMap.has(l)) layerMap.set(l, []);
				layerMap.get(l)!.push(b);
			});

		// Sort layer keys naturally
		const sortedLayers = Array.from(layerMap.keys()).sort();

		return {
			nullBooks,
			layers: sortedLayers.map((l) => ({
				label: l,
				books: layerMap.get(l)!.sort(sortByPriority),
			})),
		};
	}, [filtered]);

	const total = filtered.length;

	return (
		<div className="px-4 sm:px-6 py-6 pb-10 space-y-8">
			{/* Domain header */}
			<div className="space-y-1">
				<h2 className="text-lg font-semibold text-foreground">{domain}</h2>
				<p className="text-xs text-muted-foreground/60">
					{total} {total === 1 ? "book" : "books"}
				</p>
			</div>
			{total === 0 && (
				<p className="text-sm text-muted-foreground">
					No books match your search.
				</p>
			)}
			{/* Unlabeled books first */}
			{grouped.nullBooks.length > 0 && (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{grouped.nullBooks.map((book) => (
						<BookCard
							key={book.id}
							book={book}
							onClick={() => onBookClick(book)}
						/>
					))}
				</div>
			)}
			{/* Layered groups */}
			{grouped.layers.map(({ label, books: layerBooks }) => (
				<div key={label} className="space-y-3">
					<div className="flex items-center gap-2">
						<Layers className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
						<h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
							{label}
						</h3>
						<div className="flex-1 h-px bg-border/40" />
						<span className="text-[10px] text-muted-foreground/40">
							{layerBooks.length}
						</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{layerBooks.map((book) => (
							<BookCard
								key={book.id}
								book={book}
								onClick={() => onBookClick(book)}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

// ─── Edit Domain Modal ─────────────────────────────────────────────────────

function EditDomainModal({
	domain,
	onClose,
	onSave,
}: {
	domain: string;
	onClose: () => void;
	onSave: (fullName: string) => void;
}) {
	const [fullName, setFullName] = useState(domain);

	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[400px] p-0 overflow-hidden flex flex-col">
				<div className="px-6 pt-5 pb-4">
					<DialogHeader>
						<DialogTitle>Edit Domain</DialogTitle>
					</DialogHeader>
				</div>
				<div className="px-6 pb-6 space-y-4 border-t border-border/60 pt-4 bg-secondary/20">
					<div className="space-y-1.5">
						<label className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">
							Full Name
						</label>
						<input
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
						/>
					</div>
					<div className="flex justify-end gap-2 pt-1">
						<Button variant="outline" size="sm" onClick={onClose}>
							Cancel
						</Button>
						<Button
							size="sm"
							disabled={!fullName.trim()}
							onClick={() => {
								onSave(fullName.trim());
								onClose();
							}}
						>
							Save
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// ─── Book Sidebar ─────────────────────────────────────────────────────────

function BookSidebar({
	domains,
	books,
	activeDomain,
	onSelect,
	onAddBook,
	collapsed,
	onToggleCollapse,
	mobileOpen,
	onMobileClose,
}: {
	domains: string[];
	books: Book[];
	activeDomain: string;
	onSelect: (d: string) => void;
	onAddBook: () => void;
	collapsed: boolean;
	onToggleCollapse: () => void;
	mobileOpen: boolean;
	onMobileClose: () => void;
}) {
	const [addingDomain, setAddingDomain] = useState(false);
	const [newDomainName, setNewDomainName] = useState("");
	const newDomainInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (addingDomain) newDomainInputRef.current?.focus();
	}, [addingDomain]);

	const handleNewDomainSubmit = () => {
		const name = newDomainName.trim();
		if (!name) {
			setAddingDomain(false);
			return;
		}
		onSelect(name); // just switch to it — real domain created when book is added
		setNewDomainName("");
		setAddingDomain(false);
	};

	const SidebarContent = (
		<div
			className={`flex flex-col h-[95vh] pb-7 bg-card border-r border-border/50 transition-all duration-200 ${collapsed ? "w-14" : "w-fit"}`}
		>
			{/* Header */}
			<div
				className={`flex items-center px-3 py-3 border-b border-border/50 flex-shrink-0 ${collapsed ? "justify-center" : "justify-between"}`}
			>
				{!collapsed && (
					<span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
						Library
					</span>
				)}
				<button
					onClick={onToggleCollapse}
					className="p-1 rounded-md hover:bg-accent text-muted-foreground/60 hover:text-foreground transition-colors hidden sm:flex"
				>
					<ChevronRight
						className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`}
					/>
				</button>
			</div>

			{/* Nav items */}
			<div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2 min-h-0">
				{/* Overview */}
				{(() => {
					const isActive = activeDomain === "__dashboard__";
					return (
						<button
							onClick={() => {
								onSelect("__dashboard__");
								onMobileClose();
							}}
							title="Overview"
							className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors group
                ${isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground"}
                ${collapsed ? "justify-center" : ""}`}
						>
							<BookMarked className="w-4 h-4 flex-shrink-0" />
							{!collapsed && (
								<span className="truncate flex-1 text-left">Overview</span>
							)}
						</button>
					);
				})()}

				<div className="h-px bg-border/40 my-1 mx-1" />

				{/* Domain rows */}
				{domains.map((domain) => {
					const count = books.filter((b) => b.domain === domain).length;
					const isActive = activeDomain === domain;
					const Icon = getDomainIcon(domain);
					return (
						<button
							key={domain}
							onClick={() => {
								onSelect(domain);
								onMobileClose();
							}}
							title={domain}
							className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors group relative
            	   	 				${isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground"}
                					${collapsed ? "justify-center" : ""}`}
						>
							<Icon className="w-4 h-4 flex-shrink-0" />
							{!collapsed && (
								<>
									<span className="truncate flex-1 text-left text-sm">
										{domain}
									</span>
									<span
										className={`text-[10px] tabular-nums ml-auto flex-shrink-0 ${isActive ? "opacity-70" : "opacity-40"}`}
									>
										{count}
									</span>
								</>
							)}
							{collapsed && (
								<span className="absolute -top-1 -right-1 text-[9px] bg-muted text-muted-foreground rounded-full w-4 h-4 flex items-center justify-center leading-none">
									{count}
								</span>
							)}
						</button>
					);
				})}

				{/* Inline new domain input */}
				{addingDomain && !collapsed && (
					<div className="px-2 py-1">
						<input
							ref={newDomainInputRef}
							value={newDomainName}
							onChange={(e) => setNewDomainName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleNewDomainSubmit();
								if (e.key === "Escape") {
									setAddingDomain(false);
									setNewDomainName("");
								}
							}}
							onBlur={handleNewDomainSubmit}
							placeholder="Domain name..."
							className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
						/>
					</div>
				)}
			</div>

			{/* Footer actions */}
			<div
				className={`w-full p-2 flex-shrink-0 flex flex-col gap-1 ${collapsed ? "items-center" : ""}`}
			>
				{/* Add book */}
				<button
					onClick={onAddBook}
					title="Add Book"
					className={`flex items-center px-2 py-3 justify-center gap-1 rounded-lg text-xs font-medium bg-[#8b9a6b]/10 hover:bg-[#8b9a6b]/20 text-[#8b9a6b] transition-colors
            ${collapsed ? "w-8 h-8 justify-center" : "w-full"}`}
				>
					<Plus className="w-3.5 h-3.5 flex-shrink-0" />
					{!collapsed && <span>Add Book</span>}
				</button>
			</div>
		</div>
	);

	return (
		<>
			{/* Desktop sidebar */}
			<div className="hidden sm:flex h-fit flex-shrink-0 sticky top-0">
				{SidebarContent}
			</div>

			{/* Mobile drawer */}
			{mobileOpen && (
				<>
					<div
						className="fixed inset-0 z-40 bg-black/40 sm:hidden"
						onClick={onMobileClose}
					/>
					<div className="fixed inset-y-0 left-0 z-50 sm:hidden flex">
						<div className="w-64 h-full">
							{/* Force expanded on mobile */}
							<div className="flex flex-col h-full bg-card border-r border-border/50 w-64">
								{/* reuse same content but force uncollapsed */}
								<div className="flex items-center justify-between px-3 py-3 border-b border-border/50 flex-shrink-0">
									<span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
										Library
									</span>
									<button
										onClick={onMobileClose}
										className="p-1 rounded-md hover:bg-accent text-muted-foreground/60"
									>
										<X className="w-4 h-4" />
									</button>
								</div>
								{/* Domain list — same structure, collapsed=false forced */}
								<div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
									<button
										onClick={() => {
											onSelect("__dashboard__");
											onMobileClose();
										}}
										className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors
                      ${activeDomain === "__dashboard__" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
									>
										<BookMarked className="w-4 h-4 flex-shrink-0" />
										<span className="truncate flex-1 text-left">Overview</span>
									</button>
									<div className="h-px bg-border/40 my-1 mx-1" />
									{domains.map((domain) => {
										const count = books.filter(
											(b) => b.domain === domain,
										).length;
										const isActive = activeDomain === domain;
										const Icon = getDomainIcon(domain);
										return (
											<button
												key={domain}
												onClick={() => {
													onSelect(domain);
													onMobileClose();
												}}
												className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors
                          ${isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
											>
												<Icon className="w-4 h-4 flex-shrink-0" />
												<span className="truncate flex-1 text-left text-[13px]">
													{domain}
												</span>
												<span
													className={`text-[10px] tabular-nums ${isActive ? "opacity-70" : "opacity-40"}`}
												>
													{count}
												</span>
											</button>
										);
									})}
									{addingDomain && (
										<div className="px-2 py-1">
											<input
												ref={newDomainInputRef}
												value={newDomainName}
												onChange={(e) => setNewDomainName(e.target.value)}
												onKeyDown={(e) => {
													if (e.key === "Enter") handleNewDomainSubmit();
													if (e.key === "Escape") {
														setAddingDomain(false);
														setNewDomainName("");
													}
												}}
												onBlur={handleNewDomainSubmit}
												placeholder="Domain name..."
												className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
											/>
										</div>
									)}
								</div>
								<div className="border-t border-border/50 p-2 flex flex-col gap-1">
									<button
										onClick={() => setAddingDomain(true)}
										className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-colors"
									>
										<Plus className="w-3.5 h-3.5" />
										<span>New domain</span>
									</button>
									<button
										onClick={onAddBook}
										className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium bg-[#8b9a6b]/10 hover:bg-[#8b9a6b]/20 text-[#8b9a6b] transition-colors"
									>
										<Plus className="w-3.5 h-3.5" />
										<span>Add Book</span>
									</button>
								</div>
							</div>
						</div>
					</div>
				</>
			)}
		</>
	);
}

// ─── Main BookView ────────────────────────────────────────────────────────────

export function BookView() {
	const {
		books,
		isLoading,
		handleUpdate,
		handleAdd,
		handleDelete,
		handleStatusChange,
	} = useBooks();
	const [activeDomain, setActiveDomain] = useState<string>("__dashboard__");
	const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
	const [showAddModal, setShowAddModal] = useState(false);

	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	const [domainMenu, setDomainMenu] = useState<{
		domain: string;
		x: number;
		y: number;
	} | null>(null);
	const [editingDomain, setEditingDomain] = useState<string | null>(null);
	const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const handleDomainMouseDown = (e: React.MouseEvent, domain: string) => {
		longPressTimer.current = setTimeout(() => {
			setDomainMenu({ domain, x: e.clientX, y: e.clientY });
		}, 500);
	};
	const handleDomainMouseUp = () => {
		if (longPressTimer.current) clearTimeout(longPressTimer.current);
	};
	const handleDomainContextMenu = (e: React.MouseEvent, domain: string) => {
		e.preventDefault();
		setDomainMenu({ domain, x: e.clientX, y: e.clientY });
	};
	const handleUpdateDomain = async (oldName: string, newName: string) => {
		// Update all books with this domain
		const affected = books.filter((b) => b.domain === oldName);
		await Promise.all(
			affected.map((b) => handleUpdate(b.id, { domain: newName })),
		);

		if (activeDomain === oldName) setActiveDomain(newName);
	};
	const handleDeleteDomain = async (domain: string) => {
		const affected = books.filter((b) => b.domain === domain);
		await Promise.all(affected.map((b) => handleDelete(b.id)));
		if (activeDomain === domain) setActiveDomain("__dashboard__");
	};

	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(search);
		}, 300);
		return () => clearTimeout(timer);
	}, [search]);

	useEffect(() => {
		if (!domainMenu) return;
		const handler = () => setDomainMenu(null);
		window.addEventListener("click", handler);
		return () => window.removeEventListener("click", handler);
	}, [domainMenu]);

	const selectedBook = useMemo(
		() => books.find((b) => b.id === selectedBookId) ?? null,
		[books, selectedBookId],
	);

	// Derive ordered domain list from actual data
	const domains = useMemo(() => {
		const d = new Set(books.map((b) => b.domain));
		return Array.from(d).sort();
	}, [books]);

	const domainBooks = useMemo(() => {
		if (activeDomain === "__dashboard__") return [];
		return books.filter((b) => b.domain === activeDomain);
	}, [books, activeDomain]);

	if (isLoading) {
		return (
			<div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
				Loading library...
			</div>
		);
	}

	return (
		<div className="flex flex-col h-screen overflow-hidden">
			{/* Hamburger — mobile only */}
			<button
				onClick={() => setMobileSidebarOpen(true)}
				className="fixed top-4.75 right-15 sm:hidden p-1.75 border rounded-[0.25rem] hover:bg-af4-olive-muted  text-muted-foreground/60 hover:text-foreground transition-colors flex-shrink-0"
			>
				<Menu className="w-4 h-4" />
			</button>

			<div className="flex flex-1 min-h-0 overflow-hidden">
				<BookSidebar
					domains={domains}
					books={books}
					activeDomain={activeDomain}
					onSelect={(d) => setActiveDomain(d)}
					onAddBook={() => setShowAddModal(true)}
					collapsed={sidebarCollapsed}
					onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
					mobileOpen={mobileSidebarOpen}
					onMobileClose={() => setMobileSidebarOpen(false)}
				/>

				{/* Main content */}
				<div className="flex-1 min-w-0 min-h-0 overflow-y-auto ">
					<div className="flex gap-3 px-5 mt-5">
						{/* Search */}
						<div className="relative flex max-w-[600px] items-center gap-2 flex-1 bg-secondary/50 px-3 py-3 rounded-full">
							<Search className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
							<input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search title or author..."
								className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
							/>
							{search && (
								<button
									onClick={() => setSearch("")}
									className="text-muted-foreground/50 hover:text-foreground transition-colors"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							)}
							{/* Add book */}
							<button
								onClick={() => setShowAddModal(true)}
								className="absolute right-0.5 py-4 px-4 bg-transparent hover:bg-[#8b9a6b]/20 text-[#8b9a6b] rounded-r-full border-l-0 transition-colors"
							>
								<Plus className="w-3 h-3" />
							</button>
						</div>
					</div>

					{activeDomain === "__dashboard__" ? (
						<DashboardView
							books={books}
							search={debouncedSearch}
							onBookClick={(book) => setSelectedBookId(book.id)}
						/>
					) : (
						<DomainView
							domain={activeDomain}
							books={domainBooks}
							search={debouncedSearch}
							onBookClick={(book) => setSelectedBookId(book.id)}
						/>
					)}
				</div>
			</div>

			{/* Book detail modal */}
			{selectedBook && (
				<BookModal
					book={selectedBook}
					onClose={() => setSelectedBookId(null)}
					onUpdate={async (id, updates) => {
						await handleUpdate(id, updates);
					}}
					onDelete={async (id) => {
						setSelectedBookId(null);
						await handleDelete(id);
					}}
					onStatusChange={async (id, status) => {
						await handleStatusChange(id, status);
					}}
				/>
			)}
			{/* Add book modal */}
			{showAddModal && (
				<AddBookModal
					onClose={() => setShowAddModal(false)}
					onAdd={handleAdd}
					domains={domains}
					books={books}
				/>
			)}

			{domainMenu && (
				<div
					className="fixed flex flex-col z-50 bg-popover border border-border rounded-xl shadow-lg w-fit"
					style={{ top: domainMenu.y, left: domainMenu.x }}
					onClick={(e) => e.stopPropagation()}
				>
					<button
						className="text-left px-4 py-2 text-sm hover:bg-accent transition-colors"
						onClick={() => {
							setEditingDomain(domainMenu.domain);
							setDomainMenu(null);
						}}
					>
						<span className="flex">
							<Edit className="w-4 h-4 shrink-0 mr-2" /> Edit Domain
						</span>
					</button>
					<button
						className="text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
						onClick={() => {
							handleDeleteDomain(domainMenu.domain);
							setDomainMenu(null);
						}}
					>
						<span className="flex">
							<Trash2 className="w-4 h-4 shrink-0 mr-2" /> Delete It
						</span>
					</button>
				</div>
			)}

			{editingDomain && (
				<EditDomainModal
					domain={editingDomain}
					onClose={() => setEditingDomain(null)}
					onSave={(fullName) => handleUpdateDomain(editingDomain, fullName)}
				/>
			)}
		</div>
	);
}
