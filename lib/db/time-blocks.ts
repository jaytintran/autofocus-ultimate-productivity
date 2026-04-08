import { createClient } from "@/lib/supabase/client";
import type { TimeBlock } from "@/lib/types";

const supabase = createClient();

export async function getTimeBlocksForDate(date: Date): Promise<TimeBlock[]> {
	const start = new Date(date);
	start.setHours(0, 0, 0, 0);
	const end = new Date(date);
	end.setHours(23, 59, 59, 999);

	const { data, error } = await supabase
		.from("time_blocks")
		.select("*")
		.gte("start_time", start.toISOString())
		.lte("start_time", end.toISOString())
		.order("start_time", { ascending: true });

	if (error) throw error;
	return data ?? [];
}

export async function createTimeBlock(
	block: Omit<TimeBlock, "id" | "user_id" | "created_at" | "updated_at">,
): Promise<TimeBlock> {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const { data, error } = await supabase
		.from("time_blocks")
		.insert({ ...block, user_id: user.id })
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function updateTimeBlock(
	id: string,
	updates: Partial<
		Pick<TimeBlock, "label" | "color" | "start_time" | "end_time">
	>,
): Promise<void> {
	const { error } = await supabase
		.from("time_blocks")
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq("id", id);

	if (error) throw error;
}

export async function deleteTimeBlock(id: string): Promise<void> {
	const { error } = await supabase.from("time_blocks").delete().eq("id", id);

	if (error) throw error;
}
