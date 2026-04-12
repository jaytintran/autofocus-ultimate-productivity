import { createClient } from "@/lib/supabase/client";

export type BookStatus = "unread" | "reading" | "completed" | "abandoned";
export type BookPriority =
	| "CRITICAL"
	| "HIGH"
	| "MEDIUM"
	| "SUPPLEMENTAL"
	| "LOW";
export type BookType = "Core" | "Optional" | "Extension";

export interface Book {
	id: string;
	title: string;
	author: string;
	rating: number | null;
	priority: BookPriority | null;
	domain: string;
	tags: string[] | null;
	book_type: BookType;
	status: BookStatus;
	started_at: string | null;
	finished_at: string | null;
	current_page: number | null;
	total_pages: number | null;
	notes: string | null;
	key_takeaways: string | null;
	cover_url: string | null;
	created_at: string;
	updated_at: string;
}

export async function getBooks(): Promise<Book[]> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("books")
		.select("*")
		.order("priority", { ascending: true })
		.order("title", { ascending: true });
	if (error) throw error;
	return data || [];
}

export async function updateBook(
	id: string,
	updates: Partial<Book>,
): Promise<Book> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("books")
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq("id", id)
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function addBook(
	book: Omit<Book, "id" | "created_at" | "updated_at">,
): Promise<Book> {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const { data, error } = await supabase
		.from("books")
		.insert({ ...book, user_id: user.id })
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function deleteBook(id: string): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("books").delete().eq("id", id);
	if (error) throw error;
}
