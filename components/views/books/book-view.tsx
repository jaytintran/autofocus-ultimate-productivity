"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useBooks } from "@/hooks/data/use-books";
import type { Book } from "@/lib/db/books";
import { Plus, Menu, Edit, Trash2 } from "lucide-react";
import { BookSidebar } from "./book-sidebar";
import { DashboardView } from "./dashboard-view";
import { DomainView } from "./domain-view";
import { BookModal } from "./book-modal";
import { AddBookModal } from "./add-book-modal";
import { EditDomainModal } from "./edit-domain-modal";

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
		<div className="flex flex-col h-full overflow-hidden">
			{/* Hamburger — mobile only */}
			<button
				onClick={() => setMobileSidebarOpen(true)}
				className="fixed bottom-5 right-5 sm:hidden p-3 bg-foreground text-background rounded-full shadow-lg hover:bg-foreground/90 transition-all z-50"
				aria-label="Menu"
			>
				<Menu className="w-5 h-5" />
			</button>

			<div className="flex flex-1 min-h-0 overflow-hidden">
				<BookSidebar
					domains={domains}
					books={books}
					activeDomain={activeDomain}
					onSelect={(d) => setActiveDomain(d)}
					collapsed={sidebarCollapsed}
					onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
					mobileOpen={mobileSidebarOpen}
					onMobileClose={() => setMobileSidebarOpen(false)}
					search={search}
					setSearch={setSearch}
					onDomainContextMenu={handleDomainContextMenu}
					onDomainMouseDown={handleDomainMouseDown}
					onDomainMouseUp={handleDomainMouseUp}
				/>

				{/* Main content */}
				<div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-scroll">
					{/* Header */}
					<div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3">
						<div className="flex items-center gap-2">
							<span className="text-xs font-semibold uppercase tracking-widest text-foreground">
								{activeDomain === "__dashboard__" ? "Overview" : activeDomain}
							</span>
							{activeDomain !== "__dashboard__" && (
								<span className="text-xs text-muted-foreground/40">
									{domainBooks.length}{" "}
									{domainBooks.length === 1 ? "book" : "books"}
								</span>
							)}
						</div>
						<button
							onClick={() => setShowAddModal(true)}
							className="flex items-center gap-1.5 text-xs font-medium px-4 py-3 rounded-[3px] bg-[#8b9a6b]/10 hover:bg-[#8b9a6b]/20 text-[#8b9a6b] transition-colors"
						>
							<Plus className="w-3.5 h-3.5" />
							Add Book
						</button>
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
					allBooks={books}
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
