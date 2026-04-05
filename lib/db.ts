import Dexie, { type Table } from "dexie";
import type { Task, Pamphlet } from "@/lib/types";
import type { Habit } from "@/lib/habits";
import type { Book } from "@/lib/books";
import type { Project } from "@/lib/projects";

export interface SyncQueueItem {
	id?: number;
	table: "tasks" | "habits" | "books" | "projects" | "pamphlets";
	action: "insert" | "update" | "delete";
	payload: Record<string, unknown> | object;
	timestamp: number;
}
class AppDB extends Dexie {
	tasks!: Table<Task>;
	habits!: Table<Habit>;
	books!: Table<Book>;
	projects!: Table<Project>;
	pamphlets!: Table<Pamphlet>;
	sync_queue!: Table<SyncQueueItem>;

	constructor() {
		super("autofocus_db");
		this.version(1).stores({
			tasks: "id, status, pamphlet_id, page_number, position",
			habits: "id, status, position",
			books: "id, status",
			projects: "id, status",
			pamphlets: "id, position",
			sync_queue: "++id, table, timestamp",
		});
	}
}

export const db = new AppDB();
