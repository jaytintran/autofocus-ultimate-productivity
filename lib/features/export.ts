import {
	getTasks,
	getCompletedTasks,
	getCompletedTasksCount,
} from "@/lib/db/store-v1";
import {
	getHabits,
	getLast66Days,
	getStreak,
	getWeeklyProgress,
} from "@/lib/db/habits";
import { getProjects } from "@/lib/db/projects";
import { getBooks } from "@/lib/db/books";
import type { Task } from "@/lib/types";
import type { Habit } from "@/lib/db/habits";
import type { Project } from "@/lib/db/projects";
import type { Book } from "@/lib/db/books";

export type ExportFormat = "json" | "csv" | "markdown";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timestamp(): string {
	return new Date().toISOString().split("T")[0];
}

function downloadBlob(content: string, filename: string, mime: string) {
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

function csvEscape(value: unknown): string {
	if (value === null || value === undefined) return "";
	const str = Array.isArray(value) ? value.join(" | ") : String(value);
	// Quote if contains comma, newline, or double-quote
	if (str.includes(",") || str.includes("\n") || str.includes('"')) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

function toCsvRow(fields: unknown[]): string {
	return fields.map(csvEscape).join(",");
}

// ─── Tasks Export ─────────────────────────────────────────────────────────────

async function fetchAllCompletedTasks(): Promise<Task[]> {
	const count = await getCompletedTasksCount();
	const pages = Math.ceil(count / 50);
	const all: Task[] = [];
	for (let p = 1; p <= pages; p++) {
		const page = await getCompletedTasks(p);
		all.push(...page);
	}
	return all;
}

export async function exportTasks(format: ExportFormat): Promise<void> {
	const [active, completed] = await Promise.all([
		getTasks(),
		fetchAllCompletedTasks(),
	]);

	const activeTasks = active.filter((t) => t.status !== "completed");

	if (format === "json") {
		const payload = {
			exported_at: new Date().toISOString(),
			active_tasks: activeTasks,
			completed_tasks: completed,
		};
		downloadBlob(
			JSON.stringify(payload, null, 2),
			`af4-tasks-${timestamp()}.json`,
			"application/json",
		);
		return;
	}

	if (format === "csv") {
		const headers = [
			"id",
			"text",
			"status",
			"tag",
			"due_date",
			"page_number",
			"position",
			"total_time_ms",
			"completed_at",
			"note",
		];
		const rows = [
			toCsvRow(headers),
			...activeTasks.map((t) =>
				toCsvRow([
					t.id,
					t.text,
					t.status,
					t.tag,
					t.due_date,
					t.page_number,
					t.position,
					t.total_time_ms,
					t.completed_at,
					t.note,
				]),
			),
			...completed.map((t) =>
				toCsvRow([
					t.id,
					t.text,
					t.status,
					t.tag,
					t.due_date,
					t.page_number,
					t.position,
					t.total_time_ms,
					t.completed_at,
					t.note,
				]),
			),
		];
		downloadBlob(rows.join("\n"), `af4-tasks-${timestamp()}.csv`, "text/csv");
		return;
	}

	if (format === "markdown") {
		const lines: string[] = [
			`# AF4 Tasks Export`,
			`_Exported: ${new Date().toLocaleString()}_`,
			"",
			`## Active Tasks (${activeTasks.length})`,
			"",
		];

		for (const t of activeTasks) {
			lines.push(
				`- [ ] **${t.text}**${t.tag ? ` \`${t.tag}\`` : ""}${t.due_date ? ` — due ${t.due_date}` : ""}`,
			);
		}

		lines.push("", `## Completed Tasks (${completed.length})`, "");

		for (const t of completed) {
			const date = t.completed_at
				? new Date(t.completed_at).toLocaleDateString()
				: "";
			lines.push(
				`- [x] ${t.text}${t.tag ? ` \`${t.tag}\`` : ""}${date ? ` — ${date}` : ""}`,
			);
			if (t.note) {
				lines.push(`  > ${t.note.replace(/\n/g, "\n  > ")}`);
			}
		}

		downloadBlob(
			lines.join("\n"),
			`af4-tasks-${timestamp()}.md`,
			"text/markdown",
		);
	}
}

// ─── Suite Export (Habits + Projects + Books) ─────────────────────────────────

export async function exportSuite(format: ExportFormat): Promise<void> {
	const [habits, projects, books] = await Promise.all([
		getHabits(),
		getProjects(),
		getBooks(),
	]);

	if (format === "json") {
		const payload = {
			exported_at: new Date().toISOString(),
			habits,
			projects,
			books,
		};
		downloadBlob(
			JSON.stringify(payload, null, 2),
			`af4-suite-${timestamp()}.json`,
			"application/json",
		);
		return;
	}

	if (format === "csv") {
		// Habits CSV
		const habitHeaders = [
			"id",
			"name",
			"category",
			"frequency",
			"target_days",
			"status",
			"streak",
			"completions",
		];
		const habitRows = [
			toCsvRow(habitHeaders),
			...habits.map((h) =>
				toCsvRow([
					h.id,
					h.name,
					h.category,
					h.frequency,
					h.target_days,
					h.status,
					getStreak(h),
					h.completions.join("|"),
				]),
			),
		];
		downloadBlob(
			habitRows.join("\n"),
			`af4-habits-${timestamp()}.csv`,
			"text/csv",
		);

		// Projects CSV
		const projectHeaders = [
			"id",
			"title",
			"category",
			"priority",
			"status",
			"progress",
			"due_date",
			"notes",
			"key_outcomes",
		];
		const projectRows = [
			toCsvRow(projectHeaders),
			...projects.map((p) =>
				toCsvRow([
					p.id,
					p.title,
					p.category,
					p.priority,
					p.status,
					p.progress,
					p.due_date,
					p.notes,
					p.key_outcomes,
				]),
			),
		];
		downloadBlob(
			projectRows.join("\n"),
			`af4-projects-${timestamp()}.csv`,
			"text/csv",
		);

		// Books CSV
		const bookHeaders = [
			"id",
			"title",
			"author",
			"domain",
			"priority",
			"status",
			"rating",
			"current_page",
			"total_pages",
			"notes",
			"key_takeaways",
		];
		const bookRows = [
			toCsvRow(bookHeaders),
			...books.map((b) =>
				toCsvRow([
					b.id,
					b.title,
					b.author,
					b.domain,
					b.priority,
					b.status,
					b.rating,
					b.current_page,
					b.total_pages,
					b.notes,
					b.key_takeaways,
				]),
			),
		];
		downloadBlob(
			bookRows.join("\n"),
			`af4-books-${timestamp()}.csv`,
			"text/csv",
		);
		return;
	}

	if (format === "markdown") {
		const lines: string[] = [
			`# AF4 Suite Export`,
			`_Exported: ${new Date().toLocaleString()}_`,
			"",
			"---",
			"",
			`## Habits (${habits.length})`,
			"",
		];

		for (const h of habits) {
			const streak = getStreak(h);
			const weekly = getWeeklyProgress(h);
			lines.push(`### ${h.name}`);
			lines.push(`- **Category**: ${h.category}`);
			lines.push(
				`- **Frequency**: ${h.frequency} — ${h.target_days} days/week`,
			);
			lines.push(`- **Status**: ${h.status}`);
			lines.push(`- **Current Streak**: ${streak} days`);
			lines.push(`- **This Week**: ${weekly.completed}/${weekly.target}`);
			if (h.description) lines.push(`- **Notes**: ${h.description}`);
			lines.push("");
		}

		lines.push("---", "", `## Projects (${projects.length})`, "");

		for (const p of projects) {
			lines.push(`### ${p.title}`);
			lines.push(
				`- **Status**: ${p.status} | **Priority**: ${p.priority ?? "—"}`,
			);
			lines.push(`- **Category**: ${p.category}`);
			if (p.progress !== null) lines.push(`- **Progress**: ${p.progress}%`);
			if (p.due_date) lines.push(`- **Due**: ${p.due_date}`);
			if (p.description) lines.push(`- **Description**: ${p.description}`);
			if (p.notes) lines.push(`- **Notes**: ${p.notes}`);
			if (p.key_outcomes) lines.push(`- **Key Outcomes**: ${p.key_outcomes}`);
			lines.push("");
		}

		lines.push("---", "", `## Books (${books.length})`, "");

		for (const b of books) {
			const progress =
				b.current_page && b.total_pages
					? ` (${b.current_page}/${b.total_pages} pages)`
					: "";
			lines.push(`### ${b.title}`);
			lines.push(`- **Author**: ${b.author}`);
			lines.push(
				`- **Domain**: ${b.domain} | **Priority**: ${b.priority ?? "—"}`,
			);
			lines.push(`- **Status**: ${b.status}${progress}`);
			if (b.rating)
				lines.push(
					`- **Rating**: ${"★".repeat(b.rating)}${"☆".repeat(5 - b.rating)}`,
				);
			if (b.notes) lines.push(`- **Notes**: ${b.notes}`);
			if (b.key_takeaways)
				lines.push(`- **Key Takeaways**: ${b.key_takeaways}`);
			lines.push("");
		}

		downloadBlob(
			lines.join("\n"),
			`af4-suite-${timestamp()}.md`,
			"text/markdown",
		);
	}
}
