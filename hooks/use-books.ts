import useSWR from "swr";
import {
	getBooks,
	updateBook,
	addBook,
	deleteBook,
	type Book,
} from "@/lib/books";
import { useCallback } from "react";
import { useUserId } from "./use-user-id";
import { getBooksCache, setBooksCache } from "./use-books-cache";

export function useBooks() {
	const userId = useUserId();

	// Read cache once synchronously — this is the seed for SWR on revisit
	const cachedBooks = getBooksCache();
	const hasCachedBooks = Array.isArray(cachedBooks) && cachedBooks.length > 0;

	const {
		data: books = [],
		mutate,
		isLoading,
	} = useSWR<Book[]>(userId ? `books-${userId}` : null, getBooks, {
		refreshInterval: 0,
		// Seed SWR with localStorage data — makes isLoading false immediately on revisit
		fallbackData: cachedBooks ?? undefined,
		// After every successful Supabase fetch, overwrite the cache entirely
		onSuccess(data) {
			setBooksCache(data);
		},
		// Only revalidate on mount when there's no cache — skip the fetch on revisit
		revalidateOnMount: !hasCachedBooks,
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
	});

	const handleUpdate = useCallback(
		async (id: string, updates: Partial<Book>) => {
			mutate(
				books.map((b) => (b.id === id ? { ...b, ...updates } : b)),
				false,
			);
			await updateBook(id, updates);
			// mutate() triggers refetch → onSuccess fires → cache overwritten
			await mutate();
		},
		[books, mutate],
	);

	const handleAdd = useCallback(
		async (book: Omit<Book, "id" | "created_at" | "updated_at">) => {
			await addBook(book);
			await mutate();
		},
		[mutate],
	);

	const handleDelete = useCallback(
		async (id: string) => {
			mutate(
				books.filter((b) => b.id !== id),
				false,
			);
			await deleteBook(id);
			await mutate();
		},
		[books, mutate],
	);

	const handleStatusChange = useCallback(
		async (id: string, status: Book["status"]) => {
			const now = new Date().toISOString();
			const updates: Partial<Book> = { status };
			if (status === "reading") updates.started_at = now;
			if (status === "completed") updates.finished_at = now;
			await handleUpdate(id, updates);
		},
		[handleUpdate],
	);

	return {
		books,
		// If we have cached data, never show loading — data is already there
		isLoading: hasCachedBooks ? false : isLoading,
		handleUpdate,
		handleAdd,
		handleDelete,
		handleStatusChange,
	};
}
