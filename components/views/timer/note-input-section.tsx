"use client";

import {
	Send,
	ClipboardList,
	Trophy,
	CheckCheck,
	ChevronDown,
} from "lucide-react";
import type { Task } from "@/lib/types";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { NoteEntryList } from "./note-entry-list";
import type { NoteEntry } from "./timer-bar.types";

interface NoteInputSectionProps {
	noteType: "log" | "achievement" | "sidequest";
	setNoteType: (type: "log" | "achievement" | "sidequest") => void;
	noteInput: string;
	setNoteInput: (value: string) => void;
	handleNoteSubmit: () => void;
	sidequestInput: string;
	sidequestMatches: Task[];
	sidequestSubmitting: boolean;
	handleSidequestChange: (value: string) => void;
	handleSidequestSubmit: (taskId: string | null, text: string) => void;
	clearSidequestMatches: () => void;
	noteEntries: NoteEntry[];
	mobileNotesOpen: boolean;
	setMobileNotesOpen: (open: boolean) => void;
	editingNoteId: string | null;
	editingNoteText: string;
	onEditStart: (id: string, text: string) => void;
	onEditChange: (text: string) => void;
	onEditSave: (id: string, text: string) => void;
	onEditCancel: () => void;
	onDelete: (id: string) => void;
}

export function NoteInputSection({
	noteType,
	setNoteType,
	noteInput,
	setNoteInput,
	handleNoteSubmit,
	sidequestInput,
	sidequestMatches,
	sidequestSubmitting,
	handleSidequestChange,
	handleSidequestSubmit,
	clearSidequestMatches,
	noteEntries,
	mobileNotesOpen,
	setMobileNotesOpen,
	editingNoteId,
	editingNoteText,
	onEditStart,
	onEditChange,
	onEditSave,
	onEditCancel,
	onDelete,
}: NoteInputSectionProps) {
	return (
		<div className="flex flex-col gap-3 md:border-l md:border-border/50 md:pl-6 mt-2 md:mt-0 h-full">
			{/* Input row — mobile cycling button + input + send, desktop toggler + input + send */}
			<div className="flex items-center gap-2">
				{/* Mobile: Single cycling button */}
				<button
					type="button"
					onClick={() => {
						const types: Array<"log" | "achievement" | "sidequest"> = [
							"log",
							"achievement",
							"sidequest",
						];
						const currentIndex = types.indexOf(noteType);
						const nextIndex = (currentIndex + 1) % types.length;
						setNoteType(types[nextIndex]);
					}}
					className={`md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors flex-shrink-0 ${
						noteType === "log"
							? "border-[#8b9a6b]/40 bg-[#8b9a6b]/10 text-[#8b9a6b]"
							: noteType === "achievement"
								? "border-amber-500/40 bg-amber-500/10 text-amber-500"
								: "border-sky-500/40 bg-sky-500/10 text-sky-500"
					}`}
				>
					{noteType === "log" ? (
						<>
							<ClipboardList className="w-3.5 h-3.5" />
							Log
						</>
					) : noteType === "achievement" ? (
						<>
							<Trophy className="w-3.5 h-3.5" />
							Win
						</>
					) : (
						<>
							<CheckCheck className="w-3.5 h-3.5" />
							Side Quest
						</>
					)}
				</button>

				{/* Desktop toggler only */}
				<div className="hidden md:flex items-center gap-0.5 rounded-md border border-border p-1 flex-shrink-0">
					<button
						type="button"
						onClick={() => setNoteType("log")}
						title="Session log — timestamped entry"
						className={`rounded p-1.5 transition-colors ${
							noteType === "log"
								? "bg-[#8b9a6b]/20 text-[#8b9a6b]"
								: "text-muted-foreground/40 hover:text-muted-foreground"
						}`}
					>
						<ClipboardList className="w-3.5 h-3.5" />
					</button>
					<button
						type="button"
						onClick={() => setNoteType("achievement")}
						title="Achievement — completion reflection"
						className={`rounded p-1.5 transition-colors ${
							noteType === "achievement"
								? "bg-amber-500/20 text-amber-500"
								: "text-muted-foreground/40 hover:text-muted-foreground"
						}`}
					>
						<Trophy className="w-3.5 h-3.5" />
					</button>
					<button
						type="button"
						onClick={() => setNoteType("sidequest")}
						title="Side completion — knocked off another task"
						className={`rounded p-1.5 transition-colors ${
							noteType === "sidequest"
								? "bg-sky-500/20 text-sky-500"
								: "text-muted-foreground/40 hover:text-muted-foreground"
						}`}
					>
						<CheckCheck className="w-3.5 h-3.5" />
					</button>
				</div>

				{noteType === "sidequest" ? (
					<div className="flex-1 relative">
						<input
							type="text"
							value={sidequestInput}
							onChange={(e) => handleSidequestChange(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !sidequestSubmitting) {
									if (sidequestMatches.length === 1) {
										handleSidequestSubmit(
											sidequestMatches[0].id,
											sidequestMatches[0].text,
										);
									} else {
										handleSidequestSubmit(null, sidequestInput);
									}
								}
								if (e.key === "Escape") clearSidequestMatches();
							}}
							placeholder="What did you knock off?"
							disabled={sidequestSubmitting}
							className="w-full bg-transparent border border-sky-500/40 rounded-lg px-3 py-1.5 outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40 focus:text-foreground transition-colors md:border-none md:px-0 md:py-0"
						/>
						{sidequestMatches.length > 0 && (
							<div className="absolute bottom-full mb-2 left-0 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 w-72">
								{sidequestMatches.map((task) => (
									<button
										key={task.id}
										type="button"
										onMouseDown={(e) => {
											e.preventDefault();
											handleSidequestSubmit(task.id, task.text);
										}}
										className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
									>
										<CheckCheck className="w-3 h-3 text-sky-500 flex-shrink-0" />
										<span className="truncate text-foreground">{task.text}</span>
									</button>
								))}
								{sidequestInput.trim() && (
									<button
										type="button"
										onMouseDown={(e) => {
											e.preventDefault();
											handleSidequestSubmit(null, sidequestInput);
										}}
										className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-accent transition-colors text-left border-t border-border text-muted-foreground"
									>
										<CheckCheck className="w-3 h-3 flex-shrink-0" />
										<span>Complete "{sidequestInput.trim()}" as new</span>
									</button>
								)}
							</div>
						)}
					</div>
				) : (
					<div className="flex-1 relative">
						<input
							type="text"
							value={noteInput}
							onChange={(e) => setNoteInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleNoteSubmit();
							}}
							placeholder={
								noteType === "log"
									? "Log a note, hit Enter..."
									: "What did you achieve?"
							}
							className={`w-full bg-transparent border rounded-lg px-3 py-1.5 outline-none text-xs text-muted-foreground placeholder:text-muted-foreground/40 focus:text-foreground transition-colors md:border-none md:px-0 md:py-0 ${
								noteType === "log"
									? "border-[#8b9a6b]/40"
									: "border-amber-500/40"
							}`}
						/>
					</div>
				)}
				{noteType !== "sidequest" && noteInput && (
					<button
						type="button"
						onClick={handleNoteSubmit}
						className="text-muted-foreground/40 hover:text-[#8b9a6b] transition-colors"
					>
						<Send className="w-3 h-3" />
					</button>
				)}
				{noteType === "sidequest" && sidequestInput && !sidequestSubmitting && (
					<button
						type="button"
						onMouseDown={(e) => {
							e.preventDefault();
							handleSidequestSubmit(null, sidequestInput);
						}}
						className="text-muted-foreground/40 hover:text-sky-500 transition-colors"
					>
						<Send className="w-3 h-3" />
					</button>
				)}
			</div>

			{/* Mobile collapsible */}
			<Collapsible
				open={mobileNotesOpen}
				onOpenChange={setMobileNotesOpen}
				className="md:hidden -mb-2.5"
			>
				<CollapsibleContent
					className={`${noteEntries.length > 2 ? "border border-border" : ""} pt-0 pb-1 px-2 rounded-[0.25rem]`}
				>
					<div
						className="flex flex-col gap-0.5 overflow-y-auto max-h-[88px] mt-1.5"
						style={{
							scrollbarWidth: "thin",
							scrollbarColor: "hsl(var(--border)) transparent",
						}}
					>
						<NoteEntryList
							entries={noteEntries}
							editingNoteId={editingNoteId}
							editingNoteText={editingNoteText}
							onEditStart={onEditStart}
							onEditChange={onEditChange}
							onEditSave={onEditSave}
							onEditCancel={onEditCancel}
							onDelete={onDelete}
						/>
					</div>
				</CollapsibleContent>

				{noteEntries.length > 0 && (
					<CollapsibleTrigger className="flex items-center justify-center w-full py-1 px-2 rounded-lg hover:bg-accent transition-colors">
						<ChevronDown
							className={`w-5 h-5 text-muted-foreground transition-transform ${
								mobileNotesOpen ? "rotate-180" : ""
							}`}
						/>
					</CollapsibleTrigger>
				)}
			</Collapsible>

			{/* Desktop: Note log zone - full height */}
			<div className="hidden md:flex flex-col gap-1.5 border border-border rounded-[0.25rem] py-1 px-2 flex-1 min-h-0">
				<div
					className="flex flex-col gap-0.5 overflow-y-auto flex-1"
					style={{
						scrollbarWidth: "thin",
						scrollbarColor: "hsl(var(--border)) transparent",
					}}
				>
					{noteEntries.length > 0 ? (
						<NoteEntryList
							entries={noteEntries}
							editingNoteId={editingNoteId}
							editingNoteText={editingNoteText}
							onEditStart={onEditStart}
							onEditChange={onEditChange}
							onEditSave={onEditSave}
							onEditCancel={onEditCancel}
							onDelete={onDelete}
						/>
					) : (
						<div className="flex items-center justify-center h-full text-muted-foreground/40 text-xs">
							No entries yet
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
