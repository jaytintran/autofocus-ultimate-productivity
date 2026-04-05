import { db, type SyncQueueItem } from "@/lib/db";

export function isOnline(): boolean {
	return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export async function queueWrite(
	item: Omit<SyncQueueItem, "id" | "timestamp">,
): Promise<void> {
	await db.sync_queue.add({
		...item,
		payload: item.payload as Record<string, unknown>,
		timestamp: Date.now(),
	});
}
