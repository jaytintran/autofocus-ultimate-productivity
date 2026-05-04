import { createClient } from "@/lib/supabase/client";

export type ProjectStatus =
	| "planning"
	| "active"
	| "paused"
	| "completed"
	| "archived";
export type ProjectPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface Project {
	id: string;
	title: string;
	description: string | null;
	category: string[];
	priority: ProjectPriority | null;
	status: ProjectStatus;
	progress: number | null; // 0–100
	due_date: string | null;
	notes: string | null;
	key_outcomes: string | null;
	created_at: string;
	updated_at: string;
}

export async function getProjects(): Promise<Project[]> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("projects")
		.select("*")
		.order("priority", { ascending: true })
		.order("title", { ascending: true });
	if (error) throw error;
	return data || [];
}

export async function updateProject(
	id: string,
	updates: Partial<Project>,
): Promise<Project> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("projects")
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq("id", id)
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function addProject(
	project: Omit<Project, "id" | "created_at" | "updated_at">,
): Promise<Project> {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const { data, error } = await supabase
		.from("projects")
		.insert({ ...project, user_id: user.id })
		.select()
		.single();

	if (error) throw error;
	return data;
}
export async function deleteProject(id: string): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("projects").delete().eq("id", id);
	if (error) throw error;
}
