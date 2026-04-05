import { createClient } from "@/lib/supabase/client";
import { db } from "@/lib/db";
import { isOnline, queueWrite } from "@/lib/offline-guard";

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
	category: string;
	priority: ProjectPriority | null;
	status: ProjectStatus;
	progress: number | null; // 0–100
	due_date: string | null;
	notes: string | null;
	key_outcomes: string | null;
	created_at: string;
	updated_at: string;
	user_id: string;
}

export async function getProjects(): Promise<Project[]> {
	if (!isOnline()) {
		return db.projects.toArray();
	}

	try {
		const supabase = createClient();
		const { data, error } = await supabase
			.from("projects")
			.select("*")
			.order("priority", { ascending: true })
			.order("title", { ascending: true });

		if (error) throw error;

		const projects = data || [];
		await db.projects.bulkPut(projects);
		return projects;
	} catch (error) {
		// Fallback to cache on any error
		return db.projects.toArray();
	}
}

export async function updateProject(
	id: string,
	updates: Partial<Project>,
): Promise<Project> {
	const now = new Date().toISOString();
	const updatedFields = { ...updates, updated_at: now };

	if (!isOnline()) {
		await db.projects.update(id, updatedFields);
		await queueWrite({
			table: "projects",
			action: "update",
			payload: { id, ...updatedFields },
		});
		const project = await db.projects.get(id);
		return project!;
	}

	const supabase = createClient();
	const { data, error } = await supabase
		.from("projects")
		.update(updatedFields)
		.eq("id", id)
		.select()
		.single();
	if (error) throw error;
	await db.projects.put(data);
	return data;
}

export async function addProject(
	project: Omit<Project, "id" | "created_at" | "updated_at" | "user_id">,
): Promise<Project> {
	const now = new Date().toISOString();

	if (!isOnline()) {
		const supabase = createClient();
		const {
			data: { session },
		} = await supabase.auth.getSession();
		const user = session?.user ?? null;
		if (!user) throw new Error("Not authenticated");

		const newProject: Project = {
			...project,
			id: crypto.randomUUID(),
			user_id: user.id,
			created_at: now,
			updated_at: now,
		};
		await db.projects.put(newProject);
		await queueWrite({
			table: "projects",
			action: "insert",
			payload: newProject as unknown as Record<string, unknown>,
		});
		return newProject;
	}

	const supabase = createClient();
	const {
		data: { session },
	} = await supabase.auth.getSession();
	const user = session?.user ?? null;
	if (!user) throw new Error("Not authenticated");

	const { data, error } = await supabase
		.from("projects")
		.insert({ ...project, user_id: user.id })
		.select()
		.single();
	if (error) throw error;
	await db.projects.put(data);
	return data;
}

export async function deleteProject(id: string): Promise<void> {
	if (!isOnline()) {
		await db.projects.delete(id);
		await queueWrite({ table: "projects", action: "delete", payload: { id } });
		return;
	}

	const supabase = createClient();
	const { error } = await supabase.from("projects").delete().eq("id", id);
	if (error) throw error;
	await db.projects.delete(id);
}
