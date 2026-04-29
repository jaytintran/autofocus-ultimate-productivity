"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Play, Send, KeyboardIcon, BookOpen, FolderKanban } from "lucide-react";
import type { Task } from "@/lib/types";
import { TAG_DEFINITIONS, getTagDefinition, type TagId } from "@/lib/tags";
import { parseDueDateShortcut } from "@/lib/utils/due-date-parser";
import type { TimerBarProps } from "./timer-bar.types";
import { capitalizeText, parseTagMention } from "./timer-bar.utils";
import { useBooks } from "@/hooks/data/use-books";
import { useProjects } from "@/hooks/data/use-projects";
import { CompactBooksList } from "./compact-books-list";
import { CompactProjectsList } from "./compact-projects-list";
import { BookModal } from "@/components/views/books/book-modal";
import { ProjectModal } from "@/components/views/projects/project-modal";
import type { Book, BookStatus } from "@/lib/db/books";
import type { Project, ProjectStatus } from "@/lib/db/projects";

interface IdleInputProps {
	activeTasks: Task[];
	onAddTaskAndStart: TimerBarProps["onAddTaskAndStart"];
	onStartTask: TimerBarProps["onStartTask"];
}

type ViewMode = "books" | "projects";

export function IdleInput({
	activeTasks,
	onAddTaskAndStart,
	onStartTask,
}: IdleInputProps) {
	const [focusQuery, setFocusQuery] = useState("");
	const [focusInlineTag, setFocusInlineTag] = useState<TagId | null>(null);
	const [focusMentionQuery, setFocusMentionQuery] = useState<string | null>(
		null,
	);
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [dropdownPosition, setDropdownPosition] = useState<"top" | "bottom">(
		"top",
	);
	const [viewMode, setViewMode] = useState<ViewMode>("books");
	const inputRef = useRef<HTMLInputElement>(null);
	const inputContainerRef = useRef<HTMLDivElement>(null);

	const { books, handleUpdate: updateBook, handleDelete: deleteBook, handleStatusChange: changeBookStatus } = useBooks();
	const { projects, handleUpdate: updateProject, handleDelete: deleteProject, handleStatusChange: changeProjectStatus } = useProjects();

	const [selectedBook, setSelectedBook] = useState<Book | null>(null);
	const [selectedProject, setSelectedProject] = useState<Project | null>(null);

	useEffect(() => {
		const t = setTimeout(() => setDebouncedQuery(focusQuery), 400);
		return () => clearTimeout(t);
	}, [focusQuery]);

	// Check available space and adjust dropdown position
	useEffect(() => {
		if (focusMentionQuery !== null && inputContainerRef.current) {
			const rect = inputContainerRef.current.getBoundingClientRect();
			const spaceAbove = rect.top;
			const spaceBelow = window.innerHeight - rect.bottom;

			// If less than 200px above, show below instead
			setDropdownPosition(spaceAbove < 200 ? "bottom" : "top");
		}
	}, [focusMentionQuery]);

	const focusMatches = useMemo(
		() =>
			debouncedQuery.trim()
				? activeTasks
						.filter((t) =>
							t.text.toLowerCase().includes(debouncedQuery.toLowerCase()),
						)
						.slice(0, 6)
				: [],
		[debouncedQuery, activeTasks],
	);

	const focusTagDef = focusInlineTag ? getTagDefinition(focusInlineTag) : null;

	const focusMentionResults = useMemo(
		() =>
			focusMentionQuery !== null
				? TAG_DEFINITIONS.filter((t) =>
						t.id.startsWith(focusMentionQuery.toLowerCase()),
					)
				: [],
		[focusMentionQuery],
	);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setFocusQuery(value);
		const mentionMatch = value.match(/#(\w*)$/);
		setFocusMentionQuery(mentionMatch ? mentionMatch[1] : null);
		const { tag } = parseTagMention(value);
		setFocusInlineTag(tag);
	};

	const handleSubmit = useCallback(async () => {
		const trimmed = focusQuery.trim();
		if (!trimmed || submitting) return;

		const { tag, cleanText: tagClean } = parseTagMention(trimmed);
		const { cleanText, dueDate } = parseDueDateShortcut(tagClean || trimmed);
		const finalTag = focusInlineTag ?? tag;
		const finalText = capitalizeText(cleanText || tagClean || trimmed);

		// Clear input immediately — no waiting
		setFocusQuery("");
		setFocusInlineTag(null);
		setFocusMentionQuery(null);
		setSubmitting(true);

		try {
			await onAddTaskAndStart(
				finalText,
				finalTag,
				dueDate ? dueDate.toISOString() : null,
			);
		} finally {
			setSubmitting(false);
		}
	}, [focusQuery, focusInlineTag, submitting, onAddTaskAndStart]);

	const handleSelectExisting = useCallback(
		async (task: Task) => {
			setFocusQuery("");
			setFocusInlineTag(null);
			setFocusMentionQuery(null);
			await onStartTask(task);
		},
		[onStartTask],
	);

	const handleMentionSelect = (tagId: TagId) => {
		setFocusQuery((q) => q.replace(/#\w*$/, "").trim());
		setFocusInlineTag(tagId);
		setFocusMentionQuery(null);
		inputRef.current?.focus();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (focusMentionQuery !== null && focusMentionResults.length === 1) {
				handleMentionSelect(focusMentionResults[0].id);
				return;
			}
			if (focusMatches.length === 1 && focusQuery.trim()) {
				handleSelectExisting(focusMatches[0]);
				return;
			}
			handleSubmit();
		}
		if (e.key === "Escape") setFocusMentionQuery(null);
	};

	const { dueDate: parsedDueDate, dueDateLabel } =
		parseDueDateShortcut(focusQuery);

	// Load viewMode from localStorage on mount
	useEffect(() => {
		const saved = localStorage.getItem("timer-idle-view");
		if (saved === "books" || saved === "projects") {
			setViewMode(saved);
		}
	}, []);

	// Save viewMode to localStorage when it changes
	const handleViewModeChange = (mode: ViewMode) => {
		setViewMode(mode);
		localStorage.setItem("timer-idle-view", mode);
	};

	return (
		<div className="w-full bg-card h-full flex flex-col">
			{/* Top: Input section */}
			<div className="md:px-4 py-3 md:py-6 max-sm:py-6">
				<div className="flex flex-col items-center w-full px-4 md:px-0">
					<div
						ref={inputContainerRef}
						className="relative w-full flex md:justify-center items-center"
					>
					{/* Tag mention dropdown */}
					{focusMentionQuery !== null && focusMentionResults.length > 0 && (
						<div
							className={`absolute ${dropdownPosition === "top" ? "bottom-full mb-2" : "top-full mt-2"} left-0 bg-card border border-border rounded-xl shadow-lg p-1.5 z-50 min-w-[160px]`}
						>
							<p className="text-[10px] text-muted-foreground px-2 py-1">
								Tag as...
							</p>
							{focusMentionResults.map((tag) => (
								<button
									key={tag.id}
									type="button"
									onMouseDown={(e) => {
										e.preventDefault();
										handleMentionSelect(tag.id);
									}}
									className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-lg hover:bg-accent transition-colors text-left"
								>
									<span>{tag.emoji}</span>
									<span>{tag.label}</span>
								</button>
							))}
						</div>
					)}

					<div className="flex items-center gap-3 py-2 md:w-1/2 w-full max-sm:justify-between md:border-r">
						<KeyboardIcon className="w-5 h-5 text-muted-foreground shrink-0" />

						{focusTagDef && (
							<button
								type="button"
								onClick={() => setFocusInlineTag(null)}
								className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[#8b9a6b]/10 hover:bg-destructive/10 hover:text-destructive transition-colors group flex-shrink-0"
							>
								<span>{focusTagDef.emoji}</span>
								<span>{focusTagDef.label}</span>
								<span className="opacity-0 group-hover:opacity-100 ml-0.5">
									×
								</span>
							</button>
						)}

						<input
							ref={inputRef}
							type="text"
							value={focusQuery}
							onChange={handleChange}
							onKeyDown={handleKeyDown}
							placeholder="What are you working on?"
							className="flex-1 bg-transparent border-none outline-none text-base text-foreground placeholder:text-muted-foreground/50 placeholder:text-sm"
							autoFocus
							disabled={submitting}
						/>

						{parsedDueDate && (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-500 flex-shrink-0">
								⏰ {dueDateLabel}
							</span>
						)}

						{focusQuery.trim() && !submitting && (
							<button
								type="button"
								onClick={handleSubmit}
								className="p-1.5 hover:bg-accent rounded-full transition-colors flex-shrink-0"
							>
								<Send className="w-4 h-4 text-[#8b9a6b]" />
							</button>
						)}

						{submitting && (
							<div className="w-4 h-4 border-2 border-[#8b9a6b]/30 border-t-[#8b9a6b] rounded-full animate-spin flex-shrink-0" />
						)}
					</div>

					{/* Existing task matches */}
					{focusMatches.length > 0 && (
						<div className="absolute top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden z-100">
							{focusMatches.map((task) => {
								const tagDef = task.tag ? getTagDefinition(task.tag) : null;
								return (
									<button
										key={task.id}
										type="button"
										onClick={() => handleSelectExisting(task)}
										className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left"
									>
										<Play className="w-3 h-3 text-[#8b9a6b] flex-shrink-0" />
										<span className="flex-1 truncate text-foreground">
											{task.text}
										</span>
										{tagDef && (
											<span className="text-xs text-muted-foreground flex-shrink-0">
												{tagDef.emoji} {tagDef.label}
											</span>
										)}
									</button>
								);
							})}
							{focusQuery.trim() && (
								<button
									type="button"
									onClick={handleSubmit}
									className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left border-t border-border text-muted-foreground"
								>
									<Send className="w-3 h-3 flex-shrink-0" />
									<span>Create "{focusQuery.trim()}" and start</span>
								</button>
							)}
						</div>
					)}
				</div>
			</div>
		</div>

		{/* Bottom: Books/Projects section - Desktop only */}
		<div className="hidden md:block flex-1 border-t border-border p-4 overflow-y-auto">
			{/* Switcher */}
			<div className="flex items-center gap-2 mb-4">
				<button
					onClick={() => handleViewModeChange("books")}
					className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
						viewMode === "books"
							? "bg-[#8b9a6b]/10 text-[#8b9a6b]"
							: "text-muted-foreground hover:bg-accent"
					}`}
				>
					<BookOpen className="w-3.5 h-3.5" />
					Books
				</button>
				<button
					onClick={() => handleViewModeChange("projects")}
					className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
						viewMode === "projects"
							? "bg-[#8b9a6b]/10 text-[#8b9a6b]"
							: "text-muted-foreground hover:bg-accent"
					}`}
				>
					<FolderKanban className="w-3.5 h-3.5" />
					Projects
				</button>
			</div>

			{/* Content */}
			{viewMode === "books" ? (
				<CompactBooksList
					books={books}
					onBookClick={setSelectedBook}
					onStatusChange={changeBookStatus}
				/>
			) : (
				<CompactProjectsList
					projects={projects}
					onProjectClick={setSelectedProject}
					onStatusChange={changeProjectStatus}
				/>
			)}
		</div>

		{/* Book Modal */}
		{selectedBook && (
			<BookModal
				book={selectedBook}
				allBooks={books}
				onClose={() => setSelectedBook(null)}
				onUpdate={updateBook}
				onDelete={async (id) => {
					setSelectedBook(null);
					await deleteBook(id);
				}}
				onStatusChange={changeBookStatus}
			/>
		)}

		{/* Project Modal */}
		{selectedProject && (
			<ProjectModal
				project={selectedProject}
				onClose={() => setSelectedProject(null)}
				onUpdate={updateProject}
				onDelete={async (id) => {
					setSelectedProject(null);
					await deleteProject(id);
				}}
				onStatusChange={changeProjectStatus}
			/>
		)}
	</div>
	);
}
