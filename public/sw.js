const CACHE_NAME = "autofocus-v1";
const STATIC_ASSETS = ["/", "/favicon.svg"];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
	);
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
				),
			),
	);
	self.clients.claim();
});

self.addEventListener("fetch", (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip Supabase and non-GET requests
	if (request.method !== "GET") return;
	if (url.hostname.includes("supabase")) return;

	event.respondWith(
		caches.match(request).then((cached) => {
			const fetchPromise = fetch(request)
				.then((response) => {
					if (response.ok) {
						const clone = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
					}
					return response;
				})
				.catch(() => cached);

			return cached || fetchPromise;
		}),
	);
});
