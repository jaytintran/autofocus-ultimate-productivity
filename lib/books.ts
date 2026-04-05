import { createClient } from "@/lib/supabase/client";
import { db } from "@/lib/db";
import { isOnline, queueWrite } from "@/lib/offline-guard";

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
	layer: string | null;
	book_type: BookType;
	status: BookStatus;
	started_at: string | null;
	finished_at: string | null;
	current_page: number | null;
	total_pages: number | null;
	notes: string | null;
	key_takeaways: string | null;
	cover_url: string | null;
	position: number;
	created_at: string;
	updated_at: string;
	user_id: string;
}

export async function getBooks(): Promise<Book[]> {
	if (!isOnline()) {
		return db.books.orderBy("status").toArray();
	}

	try {
		const supabase = createClient();
		const { data, error } = await supabase
			.from("books")
			.select("*")
			.order("priority", { ascending: true })
			.order("title", { ascending: true });

		if (error) throw error;

		const books = data || [];
		await db.books.bulkPut(books);
		return books;
	} catch (error) {
		// Fallback to cache on any error (auth, network, etc.)
		return db.books.orderBy("status").toArray();
	}
}

export async function updateBook(
	id: string,
	updates: Partial<Book>,
): Promise<Book> {
	const now = new Date().toISOString();
	const updatedFields = { ...updates, updated_at: now };

	if (!isOnline()) {
		await db.books.update(id, updatedFields);
		await queueWrite({
			table: "books",
			action: "update",
			payload: { id, ...updatedFields },
		});
		const book = await db.books.get(id);
		return book!;
	}

	const supabase = createClient();
	const { data, error } = await supabase
		.from("books")
		.update(updatedFields)
		.eq("id", id)
		.select()
		.single();
	if (error) throw error;
	await db.books.put(data);
	return data;
}

export async function addBook(
	book: Omit<Book, "id" | "created_at" | "updated_at" | "position" | "user_id">,
): Promise<Book> {
	const now = new Date().toISOString();

	if (!isOnline()) {
		// Get user id from cached auth session (available offline after first login)
		const supabase = createClient();
		const {
			data: { session },
		} = await supabase.auth.getSession();
		const user = session?.user ?? null;
		if (!user) throw new Error("Not authenticated");

		// Compute next position from IDB
		const existing = await db.books
			.orderBy("position")
			.reverse()
			.limit(1)
			.toArray();
		const nextPosition = existing.length > 0 ? existing[0].position + 1 : 0;

		const newBook: Book = {
			...book,
			id: crypto.randomUUID(),
			position: nextPosition,
			user_id: user.id,
			created_at: now,
			updated_at: now,
		};
		await db.books.put(newBook);
		await queueWrite({
			table: "books",
			action: "insert",
			payload: newBook as unknown as Record<string, unknown>,
		});
		return newBook;
	}

	const supabase = createClient();
	const {
		data: { session },
	} = await supabase.auth.getSession();
	const user = session?.user ?? null;
	if (!user) throw new Error("Not authenticated");

	const { data, error } = await supabase
		.from("books")
		.insert({ ...book, user_id: user.id })
		.select()
		.single();
	if (error) throw error;
	await db.books.put(data);
	return data;
}

export async function deleteBook(id: string): Promise<void> {
	if (!isOnline()) {
		await db.books.delete(id);
		await queueWrite({ table: "books", action: "delete", payload: { id } });
		return;
	}

	const supabase = createClient();
	const { error } = await supabase.from("books").delete().eq("id", id);
	if (error) throw error;
	await db.books.delete(id);
}
