const CACHE_KEY = "af4_books_cache";

export function getBooksCache() {
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export function setBooksCache(books: unknown[]) {
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify(books));
	} catch {}
}

export function clearBooksCache() {
	localStorage.removeItem(CACHE_KEY);
}
