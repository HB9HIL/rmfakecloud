// the app shell for starting offline, the documents always come from the server
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.method === "POST" && url.pathname === "/share") return e.respondWith(share(req));
  if (req.method !== "GET" || url.pathname.startsWith("/ui/api/")) return;
  if (req.mode === "navigate") return e.respondWith(page(req));
  if (url.pathname.startsWith("/assets/")) return e.respondWith(asset(req));
});

// network first, a new build drops the assets of the old one
async function page(req) {
  const cache = await caches.open("shell");
  try {
    const res = await fetch(req);
    if (res.ok && res.headers.get("Content-Type")?.startsWith("text/html")) {
      const html = await res.clone().text();
      const old = await cache.match("/");
      if (old && (await old.text()) !== html) await caches.delete("assets");
      await cache.put("/", res.clone());
    }
    return res;
  } catch {
    return (await cache.match("/")) ?? Response.error();
  }
}

// hashed names never change
async function asset(req) {
  const cache = await caches.open("assets");
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) await cache.put(req, res.clone());
  return res;
}

// android share target: the page uploads the files with its session
async function share(req) {
  const files = (await req.formData()).getAll("file");
  await caches.delete("share");
  const cache = await caches.open("share");
  for (const f of files) await cache.put(`/shared/${encodeURIComponent(f.name)}`, new Response(f));
  return Response.redirect("/documents?share", 303);
}
