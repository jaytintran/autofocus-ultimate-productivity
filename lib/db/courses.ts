import { createClient } from "@/lib/supabase/client";

export type CourseStatus =
	| "not_started"
	| "in_progress"
	| "paused"
	| "completed"
	| "dropped";
export type CoursePriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface Course {
	id: string;
	title: string;
	description: string | null;
	category: string[];
	priority: CoursePriority | null;
	status: CourseStatus;
	progress: number | null; // 0–100
	platform: string | null;
	instructor: string | null;
	url: string | null;
	duration: number | null; // estimated hours
	completion_date: string | null;
	certificate_url: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export async function getCourses(): Promise<Course[]> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("courses")
		.select("*")
		.order("priority", { ascending: true })
		.order("title", { ascending: true });
	if (error) throw error;
	return data || [];
}

export async function updateCourse(
	id: string,
	updates: Partial<Course>,
): Promise<Course> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("courses")
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq("id", id)
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function addCourse(
	course: Omit<Course, "id" | "created_at" | "updated_at">,
): Promise<Course> {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const { data, error } = await supabase
		.from("courses")
		.insert({ ...course, user_id: user.id })
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function deleteCourse(id: string): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("courses").delete().eq("id", id);
	if (error) throw error;
}
