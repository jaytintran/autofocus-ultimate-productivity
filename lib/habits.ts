import { createClient } from "@/lib/supabase/client";
import { db } from "@/lib/db";
import { isOnline, queueWrite } from "@/lib/offline-guard";

export type HabitFrequency = "daily" | "weekly";
export type HabitStatus = "active" | "paused" | "archived";

export interface Habit {
	id: string;
	name: string;
	description: string | null;
	category: string;
	frequency: HabitFrequency;
	target_days: number; // e.g., 5 for "5 days per week" or 7 for daily
	color: string | null; // hex for streak visualization
	completions: string[]; // ISO date strings (YYYY-MM-DD), max 66 days kept
	status: HabitStatus;
	position: number;
	created_at: string;
	updated_at: string;
	user_id: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MAX_HISTORY_DAYS = 66;

export function getToday(): string {
	return new Date().toISOString().split("T")[0];
}

export function isCompletedOn(habit: Habit, dateStr: string): boolean {
	return habit.completions.includes(dateStr);
}

export function getStreak(habit: Habit): number {
	const completions = new Set(habit.completions);
	if (completions.size === 0) return 0;

	const today = getToday();
	const sorted = Array.from(completions).sort();
	const lastCompletion = sorted[sorted.length - 1];

	// Check if habit is still active (missed more than 1 day)
	const lastDate = new Date(lastCompletion);
	const now = new Date(today);
	const diffDays = Math.floor(
		(now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
	);

	// Lenient: allow 1 miss
	if (diffDays > 2) return 0;

	// Calculate streak backwards
	let streak = 1;
	let misses = diffDays > 0 ? 1 : 0; // Count today as miss if not done

	for (let i = sorted.length - 2; i >= 0; i--) {
		const curr = new Date(sorted[i]);
		const next = new Date(sorted[i + 1]);
		const dayDiff = Math.floor(
			(next.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24),
		);

		if (dayDiff === 1) {
			streak++;
		} else if (dayDiff === 2 && misses === 0) {
			// Used lenient miss
			misses++;
			streak++;
		} else {
			break;
		}
	}

	return streak;
}

export function getWeeklyProgress(habit: Habit): {
	completed: number;
	target: number;
	weekStart: string;
} {
	const now = new Date();
	const dayOfWeek = now.getDay(); // 0 = Sunday
	const weekStart = new Date(now);
	weekStart.setDate(now.getDate() - dayOfWeek);
	const weekStartStr = weekStart.toISOString().split("T")[0];

	let completed = 0;
	for (let i = 0; i < 7; i++) {
		const d = new Date(weekStart);
		d.setDate(weekStart.getDate() + i);
		const dStr = d.toISOString().split("T")[0];
		if (habit.completions.includes(dStr)) completed++;
	}

	return {
		completed,
		target: habit.target_days,
		weekStart: weekStartStr,
	};
}

export function getLast66Days(
	habit: Habit,
): { date: string; completed: boolean }[] {
	const result = [];
	const completions = new Set(habit.completions);
	const today = new Date();

	for (let i = 65; i >= 0; i--) {
		const d = new Date(today);
		d.setDate(d.getDate() - i);
		const dStr = d.toISOString().split("T")[0];
		result.push({
			date: dStr,
			completed: completions.has(dStr),
		});
	}

	return result;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getHabits(): Promise<Habit[]> {
	if (!isOnline()) {
		return db.habits.orderBy("position").toArray();
	}
	const supabase = createClient();
	const { data, error } = await supabase
		.from("habits")
		.select("*")
		.order("position", { ascending: true });
	if (error) throw error;
	const habits = data || [];
	await db.habits.bulkPut(habits);
	return habits;
}

export async function updateHabit(
	id: string,
	updates: Partial<Habit>,
): Promise<Habit> {
	const now = new Date().toISOString();
	const updatedFields = { ...updates, updated_at: now };

	if (!isOnline()) {
		await db.habits.update(id, updatedFields);
		await queueWrite({
			table: "habits",
			action: "update",
			payload: { id, ...updatedFields },
		});
		const habit = await db.habits.get(id);
		return habit!;
	}

	const supabase = createClient();
	const { data, error } = await supabase
		.from("habits")
		.update(updatedFields)
		.eq("id", id)
		.select()
		.single();
	if (error) throw error;
	await db.habits.put(data);
	return data;
}

export async function addHabit(
	habit: Omit<
		Habit,
		"id" | "created_at" | "updated_at" | "completions" | "position"
	>,
): Promise<Habit> {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const { data: existing } = await supabase
		.from("habits")
		.select("position")
		.eq("user_id", user.id)
		.order("position", { ascending: false })
		.limit(1);

	const nextPosition =
		existing && existing.length > 0 ? existing[0].position + 1 : 0;
	const now = new Date().toISOString();

	if (!isOnline()) {
		const newHabit: Habit = {
			...habit,
			id: crypto.randomUUID(),
			completions: [],
			position: nextPosition,
			user_id: user.id,
			created_at: now,
			updated_at: now,
		};
		await db.habits.put(newHabit);
		await queueWrite({
			table: "habits",
			action: "insert",
			payload: newHabit as unknown as Record<string, unknown>,
		});
		return newHabit;
	}

	const { data, error } = await supabase
		.from("habits")
		.insert({
			...habit,
			completions: [],
			user_id: user.id,
			position: nextPosition,
		})
		.select()
		.single();
	if (error) throw error;
	await db.habits.put(data);
	return data;
}

export async function deleteHabit(id: string): Promise<void> {
	if (!isOnline()) {
		await db.habits.delete(id);
		await queueWrite({ table: "habits", action: "delete", payload: { id } });
		return;
	}

	const supabase = createClient();
	const { error } = await supabase.from("habits").delete().eq("id", id);
	if (error) throw error;
	await db.habits.delete(id);
}

export async function toggleCompletion(
	id: string,
	dateStr: string,
	currentCompletions: string[],
): Promise<Habit> {
	const exists = currentCompletions.includes(dateStr);
	let newCompletions: string[];

	if (exists) {
		newCompletions = currentCompletions.filter((d) => d !== dateStr);
	} else {
		newCompletions = [...currentCompletions, dateStr];
	}

	// Trim to 66 days, keep most recent
	newCompletions = newCompletions.sort().slice(-MAX_HISTORY_DAYS);

	return updateHabit(id, { completions: newCompletions });
}

export async function reorderHabits(
	updates: Array<{ id: string; position: number }>,
): Promise<void> {
	const now = new Date().toISOString();

	if (!isOnline()) {
		for (const update of updates) {
			await db.habits.update(update.id, {
				position: update.position,
				updated_at: now,
			});
			await queueWrite({
				table: "habits",
				action: "update",
				payload: { id: update.id, position: update.position, updated_at: now },
			});
		}
		return;
	}

	const supabase = createClient();
	for (const update of updates) {
		const { error } = await supabase
			.from("habits")
			.update({ position: update.position, updated_at: now })
			.eq("id", update.id);
		if (error) throw error;
		await db.habits.update(update.id, {
			position: update.position,
			updated_at: now,
		});
	}
}
