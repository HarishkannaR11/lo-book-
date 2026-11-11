/* Service worker: installability, an offline fallback, and the offline screens.
 *
 * Offline screens (/expenses/new, /trips/new) read and write Dexie, so their HTML is the same
 * for every visit and can be served from cache: stale-while-revalidate, so a bunk with one bar
 * of signal still opens them instantly. Home is network-first with a 3 s timeout, falling back
 * to its last copy (the SyncStatus banner says the numbers may be old).
 *
 * Pages are cached only after sign-in, when the app posts {type: "warm"}; sign-out posts
 * {type: "signout"} and they are dropped. Never cached: server actions, API, Supabase.
 */
const VERSION = "v2";
const SHELL = `shell-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const STATIC = "static-v1";
const OCR = "ocr-v1";
const KEEP = new Set([SHELL, PAGES, STATIC, OCR]);

const OFFLINE_URL = "/offline";
const OFFLINE_SCREENS = ["/expenses/new", "/trips/new"];
const NETWORK_FIRST = ["/"];

async function cacheAssetsOf(html) {
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])];
  const statics = await caches.open(STATIC);
  await Promise.all(
    assets.map(async (url) => {
      if (!(await statics.match(url))) await statics.add(url).catch(() => undefined);
    }),
  );
}

/** Fetch a page and keep it only if it really is that page (not a redirect to /login). */
async function refreshPage(path) {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store" });
  const isHtml = (response.headers.get("content-type") ?? "").includes("text/html");
  if (!response.ok || response.redirected || !isHtml) return null;
  const pages = await caches.open(PAGES);
  await pages.put(path, response.clone());
  await cacheAssetsOf(await response.clone().text());
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL);
      await shell.addAll([OFFLINE_URL, "/icons/icon-192.png"]);
      await cacheAssetsOf(await (await shell.match(OFFLINE_URL)).text());
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (!KEEP.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const type = event.data?.type;
  if (type === "warm") {
    event.waitUntil(Promise.all([...OFFLINE_SCREENS, ...NETWORK_FIRST].map((p) => refreshPage(p).catch(() => null))));
  } else if (type === "signout") {
    event.waitUntil(caches.delete(PAGES));
  }
});

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

async function offlineFallback() {
  return (await caches.match(OFFLINE_URL, { cacheName: SHELL })) ?? Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Content-hashed build output and the OCR engine never change under the same URL.
  const immutable = url.pathname.startsWith("/_next/static/") ? STATIC : url.pathname.startsWith("/tesseract/") ? OCR : null;
  if (immutable) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(immutable);
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })(),
    );
    return;
  }

  if (request.mode !== "navigate") return;
  const path = url.pathname;

  if (OFFLINE_SCREENS.includes(path)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(path, { cacheName: PAGES });
        const fresh = refreshPage(path).catch(() => null);
        if (cached) {
          event.waitUntil(fresh);
          return cached;
        }
        // Not cached yet: go to the network, and show what the server says (login redirect etc.).
        return fetch(request).catch(offlineFallback);
      })(),
    );
    return;
  }

  if (NETWORK_FIRST.includes(path)) {
    event.respondWith(
      (async () => {
        try {
          const response = await withTimeout(fetch(request), 3000);
          if (response.ok && !response.redirected) {
            const pages = await caches.open(PAGES);
            await pages.put(path, response.clone());
          }
          return response;
        } catch {
          return (await caches.match(path, { cacheName: PAGES })) ?? offlineFallback();
        }
      })(),
    );
    return;
  }

  event.respondWith(fetch(request).catch(offlineFallback));
});
