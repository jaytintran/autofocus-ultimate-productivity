import { useState, useRef, useEffect } from "react";
import { Plus, Search, X, ChevronRight, BookMarked } from "lucide-react";
import type { Book } from "@/lib/db/books";
import { getDomainIcon } from "./domain-icons";

export function BookSidebar({
	domains,
	books,
	activeDomain,
	onSelect,
	collapsed,
	onToggleCollapse,
	mobileOpen,
	onMobileClose,
	search,
	setSearch,
	onDomainContextMenu,
	onDomainMouseDown,
	onDomainMouseUp,
}: {
	domains: string[];
	books: Book[];
	activeDomain: string;
	onSelect: (d: string) => void;
	collapsed: boolean;
	onToggleCollapse: () => void;
	mobileOpen: boolean;
	onMobileClose: () => void;
	search: string;
	setSearch: (s: string) => void;
	onDomainContextMenu: (e: React.MouseEvent, domain: string) => void;
	onDomainMouseDown: (e: React.MouseEvent, domain: string) => void;
	onDomainMouseUp: () => void;
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
		onSelect(name);
		setNewDomainName("");
		setAddingDomain(false);
	};

	const SidebarContent = (
		<div
			className={`flex flex-col h-screen bg-card border-r border-border/50 transition-all duration-200 ${collapsed ? "w-14" : "w-fit"}`}
		>
			{/* Search */}
			<div
				className={`flex-shrink-0 border-b border-border/50 ${collapsed ? "flex justify-center px-2 py-2" : "px-2 py-2"}`}
			>
				{collapsed ? (
					<button
						onClick={onToggleCollapse}
						title="Expand to search"
						className="p-2 rounded-lg hover:bg-accent text-muted-foreground/50 hover:text-foreground transition-colors"
					>
						<Search className="w-4 h-4" />
					</button>
				) : (
					<div className="flex items-center gap-2 bg-secondary/10 rounded-lg px-2.5 py-2">
						<Search className="w-3.5 h-3.5 text-foreground shrink-0" />
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search..."
							className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground/30 min-w-0 w-32"
						/>
						{search && (
							<button
								onClick={() => setSearch("")}
								className="text-muted-foreground/40 hover:text-foreground transition-colors flex-shrink-0"
							>
								<X className="w-3 h-3" />
							</button>
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
				)}
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
							onMouseDown={(e) => onDomainMouseDown(e, domain)}
							onMouseUp={onDomainMouseUp}
							onMouseLeave={onDomainMouseUp}
							onContextMenu={(e) => onDomainContextMenu(e, domain)}
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

				<div className="h-px bg-border/40 my-1 mx-1" />

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

				{/* Add Domain Button */}
				<button
					onClick={() => setAddingDomain(true)}
					title="Add Domain"
					className={`mt-1 flex items-center px-2 py-2.5 justify-center gap-1 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors
    				${collapsed ? "w-8 h-8" : "w-full"}`}
				>
					<Plus className="w-3.5 h-3.5 flex-shrink-0" />
					{!collapsed && <span>Add Domain</span>}
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
							<div className="flex flex-col h-full bg-card border-r border-border/50 w-64">
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
												onMouseDown={(e) => onDomainMouseDown(e, domain)}
												onMouseUp={onDomainMouseUp}
												onMouseLeave={onDomainMouseUp}
												onContextMenu={(e) => onDomainContextMenu(e, domain)}
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
								<button
									onClick={() => setAddingDomain(true)}
									className="w-full flex items-center gap-2 px-2 py-2.5 justify-center rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
								>
									<Plus className="w-3.5 h-3.5" /> Add Domain
								</button>
							</div>
						</div>
					</div>
				</>
			)}
		</>
	);
}
