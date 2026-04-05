import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";

async function refreshAllCaches(): Promise<void> {
	const supabase = createClient();

	const [tasks, habits, books, projects, pamphlets] = await Promise.all([
		supabase.from("tasks").select("*"),
		supabase.from("habits").select("*"),
		supabase.from("books").select("*"),
		supabase.from("projects").select("*"),
		supabase.from("pamphlets").select("*"),
	]);

	await Promise.all([
		db.tasks.bulkPut(tasks.data || []),
		db.habits.bulkPut(habits.data || []),
		db.books.bulkPut(books.data || []),
		db.projects.bulkPut(projects.data || []),
		db.pamphlets.bulkPut(pamphlets.data || []),
	]);
}

export async function flushSyncQueue(): Promise<void> {
	const items = await db.sync_queue.orderBy("timestamp").toArray();
	if (items.length === 0) return;

	const supabase = createClient();

	for (const item of items) {
		try {
			if (item.action === "insert") {
				await supabase.from(item.table).insert(item.payload);
			} else if (item.action === "update") {
				const { id, ...updates } = item.payload;
				await supabase.from(item.table).update(updates).eq("id", id);
			} else if (item.action === "delete") {
				await supabase
					.from(item.table)
					.delete()
					.eq("id", item.payload.id as string);
			}
			await db.sync_queue.delete(item.id!);
		} catch (e) {
			console.error("Sync failed at item", item.id, e);
			break;
		}
	}
}

export async function startSyncListener(): Promise<void> {
	if (typeof window === "undefined") return;

	window.addEventListener("online", async () => {
		console.log("Back online — flushing sync queue...");
		await flushSyncQueue();
		await refreshAllCaches();
	});
}
