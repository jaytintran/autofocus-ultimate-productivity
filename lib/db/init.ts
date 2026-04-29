import {
	getPamphlets,
	getAppState,
	getActiveTasksForPamphlet,
} from "@/lib/db/store-v1";
import { getHabits } from "@/lib/db/habits";
import { getActivePamphletId } from "@/lib/db/pamphlet-cache";
import type { Task, AppState, Pamphlet } from "@/lib/types";
import type { Habit } from "@/lib/db/habits";

export interface InitialAppData {
	pamphlets: Pamphlet[];
	appState: AppState;
	habits: Habit[];
	activeTasks: Task[];
	activePamphletId: string | null;
}

/**
 * Initializes the app by fetching all required data in parallel.
 * This reduces the waterfall effect of sequential data fetching.
 */
export async function initializeApp(
	userId: string,
): Promise<InitialAppData | null> {
	try {
		// Fetch pamphlets, appState, and habits in parallel
		const [pamphlets, appState, habits] = await Promise.all([
			getPamphlets(),
			getAppState(),
			getHabits(),
		]);

		// Determine active pamphlet ID
		const activePamphletId = getActivePamphletId() || pamphlets[0]?.id || null;

		// Fetch active tasks for the selected pamphlet
		const activeTasks = activePamphletId
			? await getActiveTasksForPamphlet(activePamphletId)
			: [];

		return {
			pamphlets,
			appState,
			habits,
			activeTasks,
			activePamphletId,
		};
	} catch (error) {
		console.error("Failed to initialize app:", error);
		return null;
	}
}
